import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Route-level tests for /api/stripe/webhook.
 *
 * Surfaces under test:
 *   - missing STRIPE_WEBHOOK_SECRET → 503
 *   - missing `stripe-signature` header → 400
 *   - constructEvent rejects → 400
 *   - first insert into webhook_events succeeds + handleEvent runs +
 *     grantCredits called + processed_at stamped → 200 received:true
 *   - duplicate-key insert (replay) → 200 received:true duplicate:true,
 *     grantCredits NOT called
 *   - handleEvent throws → 500 (Stripe retries)
 *   - processed_at update errors → still 200 but Sentry captured
 *     (red-team H6)
 */

const constructEvent = vi.fn()
const sessionsCreate = vi.fn()
type GrantResult = { ok: boolean; error?: string }
const grantCredits = vi.fn<() => Promise<GrantResult>>(async () => ({ ok: true }))
const trackServer = vi.fn()
const flushServer = vi.fn(async () => undefined)
const sentryCaptureException = vi.fn()

let webhookInsertResult: { error: { message: string } | null } = { error: null }
let processedUpdateResult: { error: { message: string } | null } = { error: null }

const insertCalls: Array<{ table: string; payload: unknown }> = []
const updateCalls: Array<{ table: string; payload: unknown; eqArgs: unknown[][] }> = []

function makeServiceClient() {
  function chainFor(table: string) {
    let op: 'insert' | 'update' = 'insert'
    let payload: unknown = null
    const eqArgs: unknown[][] = []
    const chain: Record<string, unknown> = {}
    chain.insert = vi.fn((p: unknown) => {
      op = 'insert'
      payload = p
      insertCalls.push({ table, payload: p })
      return Promise.resolve(webhookInsertResult)
    })
    chain.update = vi.fn((p: unknown) => {
      op = 'update'
      payload = p
      return chain
    })
    chain.eq = vi.fn((col: string, val: unknown) => {
      eqArgs.push([col, val])
      // For update chain (.update().eq().eq()) the second eq finalises.
      if (op === 'update' && eqArgs.length >= 2) {
        updateCalls.push({ table, payload, eqArgs: [...eqArgs] })
        return Promise.resolve(processedUpdateResult)
      }
      return chain
    })
    return chain
  }
  return { from: vi.fn((table: string) => chainFor(table)) }
}

vi.mock('stripe', () => {
  class FakeStripe {
    webhooks = { constructEvent: (...args: unknown[]) => constructEvent(...args) }
    checkout = { sessions: { create: (...args: unknown[]) => sessionsCreate(...args) } }
  }
  return { default: FakeStripe }
})

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => makeServiceClient(),
}))

vi.mock('@/lib/payments/credits', () => ({
  grantCredits: (...args: unknown[]) => grantCredits(...(args as [])),
}))

vi.mock('@/lib/analytics/server', () => ({
  EVENTS: { CHECKOUT_COMPLETED: 'checkout_completed' },
  trackServer: (...args: unknown[]) => trackServer(...args),
  flushServer: () => flushServer(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
}))

async function loadRoute() {
  vi.resetModules()
  return await import('./route')
}

function makeRequest(opts: { body: string; signature: string | null }) {
  const headers = new Headers()
  if (opts.signature !== null) headers.set('stripe-signature', opts.signature)
  return {
    headers: { get: (k: string) => headers.get(k) },
    text: async () => opts.body,
  } as unknown as import('next/server').NextRequest
}

const VALID_EVENT = {
  id: 'evt_test_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      metadata: { user_id: 'user-1', pack_id: 'small', credits: '50' },
      client_reference_id: 'user-1',
    },
  },
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    insertCalls.length = 0
    updateCalls.length = 0
    webhookInsertResult = { error: null }
    processedUpdateResult = { error: null }
    constructEvent.mockReset()
    sessionsCreate.mockReset()
    grantCredits.mockReset()
    grantCredits.mockResolvedValue({ ok: true })
    trackServer.mockReset()
    flushServer.mockReset()
    sentryCaptureException.mockReset()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('503 when STRIPE_WEBHOOK_SECRET is unset', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }))
    expect(res.status).toBe(503)
  })

  it('400 when stripe-signature header is missing', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ body: '{}', signature: null }))
    expect(res.status).toBe(400)
  })

  it('400 when constructEvent throws', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature')
    })
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/bad signature/)
  })

  it('happy path: inserts webhook_events, grants credits, stamps processed_at', async () => {
    constructEvent.mockReturnValue(VALID_EVENT)
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    expect(insertCalls).toHaveLength(1)
    expect(insertCalls[0].table).toBe('webhook_events')
    expect(grantCredits).toHaveBeenCalledTimes(1)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].table).toBe('webhook_events')
    expect((updateCalls[0].payload as { processed_at: string }).processed_at).toBeTruthy()
    expect(sentryCaptureException).not.toHaveBeenCalled()
  })

  it('replay: duplicate-key insert short-circuits without re-running grantCredits', async () => {
    constructEvent.mockReturnValue(VALID_EVENT)
    webhookInsertResult = { error: { message: 'duplicate key value violates unique constraint' } }
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true, duplicate: true })
    expect(grantCredits).not.toHaveBeenCalled()
    expect(updateCalls).toHaveLength(0)
  })

  it('500 when grantCredits throws — Stripe retries (idempotency row stays unprocessed)', async () => {
    constructEvent.mockReturnValue(VALID_EVENT)
    grantCredits.mockResolvedValue({ ok: false, error: 'db down' })
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }))
    expect(res.status).toBe(500)
    expect(updateCalls).toHaveLength(0)
  })

  it('still returns 200 when processed_at update fails — captures to Sentry (H6)', async () => {
    constructEvent.mockReturnValue(VALID_EVENT)
    processedUpdateResult = { error: { message: 'connection terminated' } }
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    expect(sentryCaptureException).toHaveBeenCalledTimes(1)
    const [err, ctx] = sentryCaptureException.mock.calls[0]
    expect((err as Error).message).toMatch(/processed_at stamp failed/)
    expect((ctx as { extra: { event_id: string } }).extra.event_id).toBe('evt_test_1')
  })

  it('non-checkout event types are recorded but skipped from grant', async () => {
    constructEvent.mockReturnValue({ ...VALID_EVENT, type: 'charge.refunded' })
    const { POST } = await loadRoute()
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }))
    expect(res.status).toBe(200)
    expect(grantCredits).not.toHaveBeenCalled()
    // Row still inserted for audit.
    expect(insertCalls).toHaveLength(1)
  })
})
