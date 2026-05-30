import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Module-level switches the mock client honours per test.
let selectResult: { error: { message: string } | null } = { error: null }
let selectShouldThrow = false

function makeServiceClient() {
  const chain = {
    select: vi.fn(() => {
      if (selectShouldThrow) {
        throw new Error('boom')
      }
      return Promise.resolve(selectResult)
    }),
  }
  return {
    from: vi.fn(() => chain),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => makeServiceClient()),
}))

import { GET } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  selectResult = { error: null }
  selectShouldThrow = false
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/health', () => {
  it('happy path: returns 200 with ok=true, ts ISO string, checks.db=ok, latency number', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(typeof body.ts).toBe('string')
    expect(() => new Date(body.ts).toISOString()).not.toThrow()
    expect(body.checks.db).toBe('ok')
    expect(typeof body.checks.db_latency_ms).toBe('number')
    expect(body.checks.db_latency_ms).toBeGreaterThanOrEqual(0)
  })

  it('reports version from VERCEL_GIT_COMMIT_SHA when set (first 7 chars)', async () => {
    const prev = process.env.VERCEL_GIT_COMMIT_SHA
    process.env.VERCEL_GIT_COMMIT_SHA = 'abcdef1234567'
    const res = await GET()
    const body = await res.json()
    expect(body.version).toBe('abcdef1')
    if (prev === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
    else process.env.VERCEL_GIT_COMMIT_SHA = prev
  })

  it('version is null when VERCEL_GIT_COMMIT_SHA is unset', async () => {
    const prev = process.env.VERCEL_GIT_COMMIT_SHA
    delete process.env.VERCEL_GIT_COMMIT_SHA
    const res = await GET()
    const body = await res.json()
    expect(body.version).toBeNull()
    if (prev !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = prev
  })

  it('DB error: returns 503 with ok=false, checks.db=fail', async () => {
    selectResult = { error: { message: 'connection refused' } }
    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.checks.db).toBe('fail')
  })

  it('DB throws: returns 503 (catch branch) with ok=false', async () => {
    selectShouldThrow = true
    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.checks.db).toBe('fail')
    expect(typeof body.checks.db_latency_ms).toBe('number')
  })
})
