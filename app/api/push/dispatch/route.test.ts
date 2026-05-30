import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * Route-level tests for /api/push/dispatch.
 *
 * Surfaces under test (red-team H1 + H9 + non-negotiable #3 fallback):
 *   - service-role bearer required (timing-safe via lib/auth helper)
 *   - body shape validated by Zod (generation_id uuid)
 *   - 404 when generation not found
 *   - skipped reason when status != completed
 *   - push_subscription drift → cleared, email fallback fires
 *   - push success → delivered:push, NO email
 *   - push expired (404/410) → subscription cleared, email fires
 *   - missing email AND missing push → delivered:none
 */

const sendPush = vi.fn(async () => ({ ok: true, expired: false }))
const sendEmail = vi.fn(async () => ({ ok: true }))
const buildResultReadyEmail = vi.fn(() => ({ subject: 's', html: 'h', text: 't' }))

const supabaseState: {
  gen: Record<string, unknown> | null
  profile: { email: string | null; push_subscription: unknown } | null
  trend: { slug: string; title: string } | null
  updates: Array<{ table: string; payload: unknown; idEq: string }>
} = { gen: null, profile: null, trend: null, updates: [] }

function makeClient() {
  function chainFor(table: string) {
    let op: 'select' | 'update' = 'select'
    let payload: unknown = null
    let lastId = ''
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => {
      op = 'select'
      return chain
    })
    chain.update = vi.fn((p: unknown) => {
      op = 'update'
      payload = p
      return chain
    })
    chain.eq = vi.fn((_col: string, val: unknown) => {
      lastId = String(val)
      if (op === 'update') {
        supabaseState.updates.push({ table, payload, idEq: lastId })
        return Promise.resolve({ error: null })
      }
      return chain
    })
    chain.maybeSingle = vi.fn(() => {
      const data =
        table === 'generations'
          ? supabaseState.gen
          : table === 'profiles'
            ? supabaseState.profile
            : supabaseState.trend
      return Promise.resolve({ data })
    })
    return chain
  }
  return { from: vi.fn((table: string) => chainFor(table)) }
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeClient(),
}))
vi.mock('@/lib/push/send', () => ({
  sendPush: (...args: unknown[]) => sendPush(...(args as [])),
}))
vi.mock('@/lib/email/send', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...(args as [])),
  buildResultReadyEmail: () => buildResultReadyEmail(),
}))

const SECRET = 'srk-test-1234567890'

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

const VALID_GEN_ID = '11111111-1111-4111-8111-111111111111'
const VALID_USER_ID = '22222222-2222-4222-8222-222222222222'

describe('POST /api/push/dispatch', () => {
  beforeEach(() => {
    supabaseState.gen = null
    supabaseState.profile = null
    supabaseState.trend = null
    supabaseState.updates = []
    sendPush.mockReset()
    sendPush.mockResolvedValue({ ok: true, expired: false })
    sendEmail.mockReset()
    sendEmail.mockResolvedValue({ ok: true })
    buildResultReadyEmail.mockReset()
    buildResultReadyEmail.mockReturnValue({ subject: 's', html: 'h', text: 't' })
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET)
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://test.local')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('401 when authorization header missing', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: null, body: { generation_id: VALID_GEN_ID } }))
    expect(res.status).toBe(401)
  })

  it('401 when bearer token wrong', async () => {
    const { POST } = await loadRoute()
    const res = await POST(
      makeReq({ auth: 'Bearer wrong-token-of-wrong-length', body: { generation_id: VALID_GEN_ID } }),
    )
    expect(res.status).toBe(401)
  })

  it('400 when generation_id is not a uuid', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: { generation_id: 'nope' } }))
    expect(res.status).toBe(400)
  })

  it('404 when generation row not found', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: { generation_id: VALID_GEN_ID } }))
    expect(res.status).toBe(404)
  })

  it('skips when generation status is not completed', async () => {
    supabaseState.gen = { id: VALID_GEN_ID, user_id: VALID_USER_ID, status: 'pending', trend_id: 't', output_image_url: null }
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: { generation_id: VALID_GEN_ID } }))
    expect(res.status).toBe(200)
    expect((await res.json())).toEqual({ skipped: true, reason: 'not completed' })
  })

  it('delivers push when subscription valid and sendPush succeeds', async () => {
    supabaseState.gen = { id: VALID_GEN_ID, user_id: VALID_USER_ID, status: 'completed', trend_id: 't', output_image_url: 'u' }
    supabaseState.profile = {
      email: 'u@test.local',
      push_subscription: {
        endpoint: 'https://push.example/test',
        keys: { p256dh: 'p', auth: 'a' },
      },
    }
    supabaseState.trend = { slug: 's', title: 'T' }
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: { generation_id: VALID_GEN_ID } }))
    expect(res.status).toBe(200)
    expect((await res.json())).toEqual({ delivered: 'push' })
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('clears subscription + sends email when push reports expired', async () => {
    supabaseState.gen = { id: VALID_GEN_ID, user_id: VALID_USER_ID, status: 'completed', trend_id: 't', output_image_url: 'u' }
    supabaseState.profile = {
      email: 'u@test.local',
      push_subscription: {
        endpoint: 'https://push.example/test',
        keys: { p256dh: 'p', auth: 'a' },
      },
    }
    supabaseState.trend = { slug: 's', title: 'T' }
    sendPush.mockResolvedValue({ ok: false, expired: true })
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: { generation_id: VALID_GEN_ID } }))
    expect(res.status).toBe(200)
    expect((await res.json())).toEqual({ delivered: 'email' })
    // Push subscription nulled.
    expect(supabaseState.updates).toContainEqual(
      expect.objectContaining({ table: 'profiles', payload: { push_subscription: null }, idEq: VALID_USER_ID }),
    )
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('clears subscription on Zod drift and falls through to email (H9)', async () => {
    supabaseState.gen = { id: VALID_GEN_ID, user_id: VALID_USER_ID, status: 'completed', trend_id: 't', output_image_url: 'u' }
    // Drifted shape: endpoint missing, keys mis-typed.
    supabaseState.profile = {
      email: 'u@test.local',
      push_subscription: { weird: 'shape' },
    }
    supabaseState.trend = { slug: 's', title: 'T' }
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: { generation_id: VALID_GEN_ID } }))
    expect(res.status).toBe(200)
    expect((await res.json())).toEqual({ delivered: 'email' })
    expect(sendPush).not.toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(supabaseState.updates).toContainEqual(
      expect.objectContaining({ table: 'profiles', payload: { push_subscription: null }, idEq: VALID_USER_ID }),
    )
  })

  it('returns delivered:none when no push subscription and no email', async () => {
    supabaseState.gen = { id: VALID_GEN_ID, user_id: VALID_USER_ID, status: 'completed', trend_id: 't', output_image_url: 'u' }
    supabaseState.profile = { email: null, push_subscription: null }
    supabaseState.trend = { slug: 's', title: 'T' }
    const { POST } = await loadRoute()
    const res = await POST(makeReq({ auth: `Bearer ${SECRET}`, body: { generation_id: VALID_GEN_ID } }))
    expect(res.status).toBe(200)
    expect((await res.json())).toMatchObject({ delivered: 'none' })
  })
})
