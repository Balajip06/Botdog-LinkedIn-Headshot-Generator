import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks: supabase clients (auth + admin_users lookup), orchestrator, audit log.
// ---------------------------------------------------------------------------

let authUser: { id: string } | null = null
let adminRow: { role: string } | null = null

const orchestratorResult = {
  fetched: 3,
  deduped: 2,
  proposed: 2,
  inserted: 2,
  errors: [] as string[],
}

const runTrendDetector = vi.fn(async () => orchestratorResult)
const logAdminAction = vi.fn<(arg: unknown) => Promise<void>>(async () => undefined)

vi.mock('@/lib/trends/orchestrator', () => ({
  runTrendDetector: (...args: unknown[]) => runTrendDetector(...(args as [])),
}))
vi.mock('@/lib/admin/audit', () => ({
  logAdminAction: (arg: unknown) => logAdminAction(arg),
}))

function makeAuthedClient() {
  return {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: authUser } })),
    },
  }
}

function makeServiceClient() {
  const chain = {
    select: vi.fn(function (this: unknown) {
      return chain
    }),
    eq: vi.fn(function (this: unknown) {
      return chain
    }),
    maybeSingle: vi.fn(() => Promise.resolve({ data: adminRow, error: null })),
  }
  return {
    from: vi.fn(() => chain),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(makeAuthedClient())),
  createServiceClient: vi.fn(() => makeServiceClient()),
}))

import { POST, GET } from './route'

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/admin/run-trend-discovery', {
    method: 'POST',
    headers,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  authUser = null
  adminRow = null
  orchestratorResult.errors = []
  // Default to a known cron secret; tests override per case.
  process.env.CRON_SECRET = 'test-cron-secret'
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.CRON_SECRET
})

describe('POST /api/admin/run-trend-discovery — cron auth path', () => {
  it('with valid Bearer ${CRON_SECRET} → bypasses admin check, runs orchestrator, audit-logs, 200', async () => {
    const req = makeRequest({ authorization: 'Bearer test-cron-secret' })
    const res = await POST(req as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(orchestratorResult)
    expect(runTrendDetector).toHaveBeenCalledTimes(1)
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'trend_discovery_run',
        targetTable: 'trend_suggestions',
        adminId: null,
        after: expect.objectContaining({ triggered_by: 'cron' }),
      }),
    )
  })

  it('with wrong Bearer token → falls through to admin check, 401 when no session', async () => {
    const req = makeRequest({ authorization: 'Bearer wrong-token' })
    const res = await POST(req as never)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'unauthenticated' })
    expect(runTrendDetector).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/run-trend-discovery — admin auth path', () => {
  it('unauthenticated request → 401 with { error: "unauthenticated" }', async () => {
    authUser = null
    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthenticated' })
    expect(runTrendDetector).not.toHaveBeenCalled()
  })

  it('authenticated user not in admin_users → 403 with { error: "not_admin" }', async () => {
    authUser = { id: 'user-1' }
    adminRow = null
    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'not_admin' })
    expect(runTrendDetector).not.toHaveBeenCalled()
  })

  it('authenticated admin → runs orchestrator, audit-logs with admin id + triggered_by=admin, 200', async () => {
    authUser = { id: 'admin-1' }
    adminRow = { role: 'admin' }
    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(orchestratorResult)
    expect(runTrendDetector).toHaveBeenCalledTimes(1)
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'trend_discovery_run',
        adminId: 'admin-1',
        after: expect.objectContaining({ triggered_by: 'admin' }),
      }),
    )
  })

  it('orchestrator returns errors → audit logs error_count + first 5 errors, still 200', async () => {
    authUser = { id: 'admin-1' }
    adminRow = { role: 'admin' }
    orchestratorResult.errors = ['reddit: timeout', 'tiktok: 401', 'instagram: blocked']
    const res = await POST(makeRequest() as never)
    expect(res.status).toBe(200)
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        after: expect.objectContaining({
          error_count: 3,
          errors: ['reddit: timeout', 'tiktok: 401', 'instagram: blocked'],
        }),
      }),
    )
  })
})

describe('GET /api/admin/run-trend-discovery', () => {
  it('delegates to POST and returns the same response shape', async () => {
    const req = makeRequest({ authorization: 'Bearer test-cron-secret' })
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(orchestratorResult)
  })
})
