import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * Route-level tests for /api/analytics/referral.
 *
 * Surfaces under test (red-team H1):
 *   - timing-safe bearer (via lib/auth/service-role-bearer)
 *   - 400 on Zod payload validation
 *   - skipped on non-first transition (status was already rewarded)
 *   - happy path tracks REFERRAL_REDEEMED + flushes
 */

const trackServer = vi.fn()
const flushServer = vi.fn(async () => undefined)
let profileRow: { bonus_credits_earned: number } | null = { bonus_credits_earned: 30 }

function makeServiceClient() {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: profileRow }))
  return { from: vi.fn(() => chain) }
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeServiceClient(),
}))
vi.mock('@/lib/analytics/server', () => ({
  EVENTS: { REFERRAL_REDEEMED: 'referral_redeemed' },
  trackServer: (...args: unknown[]) => trackServer(...args),
  flushServer: () => flushServer(),
}))

const SECRET = 'srk-test-1234567890abcdef'

async function loadRoute() {
  vi.resetModules()
  return await import('./route')
}

function makeReq(opts: { auth?: string | null; body?: unknown }): NextRequest {
  const headers = new Headers()
  if (opts.auth !== null && opts.auth !== undefined) {
    headers.set('authorization', opts.auth)
  }
  return {
    headers: { get: (k: string) => headers.get(k) },
    json: async () => opts.body ?? {},
  } as unknown as NextRequest
}

const VALID_PAYLOAD = {
  type: 'UPDATE',
  table: 'referrals',
  record: {
    referrer_id: '11111111-1111-4111-8111-111111111111',
    referred_id: '22222222-2222-4222-8222-222222222222',
    status: 'rewarded',
  },
  old_record: { status: 'pending' },
}

describe('POST /api/analytics/referral', () => {
  beforeEach(() => {
    trackServer.mockReset()
    flushServer.mockReset()
    profileRow = { bonus_credits_earned: 30 }
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('401 when bearer header missing', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: null, body: VALID_PAYLOAD }))
    expect(res.status).toBe(401)
  })

  it('401 when bearer token wrong (length mismatch fails fast)', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: 'Bearer wrong', body: VALID_PAYLOAD }))
    expect(res.status).toBe(401)
  })

  it('400 when payload fails Zod', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: { type: 'INSERT' } }))
    expect(res.status).toBe(400)
  })

  it('skipped when old_record.status was already rewarded', async () => {
    const { POST } = await loadRoute()
    const res = await POST(
      makeReq({
        auth: `Bearer ${SECRET}`,
        body: { ...VALID_PAYLOAD, old_record: { status: 'rewarded' } },
      }),
    )
    expect(res.status).toBe(200)
    expect((await res.json())).toEqual({ skipped: true, reason: 'not first transition' })
    expect(trackServer).not.toHaveBeenCalled()
  })

  it('fires REFERRAL_REDEEMED with hashed referrer + running bonus total', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: VALID_PAYLOAD }))
    expect(res.status).toBe(200)
    expect((await res.json())).toEqual({ ok: true })
    expect(trackServer).toHaveBeenCalledTimes(1)
    const [distinctId, event, props] = trackServer.mock.calls[0] as [
      string,
      string,
      { referrer_id_hash: string; bonus_credits: number; total_bonus_earned: number },
    ]
    expect(distinctId).toBe(VALID_PAYLOAD.record.referrer_id)
    expect(event).toBe('referral_redeemed')
    expect(props.bonus_credits).toBe(10)
    expect(props.total_bonus_earned).toBe(30)
    expect(props.referrer_id_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(flushServer).toHaveBeenCalledTimes(1)
  })
})
