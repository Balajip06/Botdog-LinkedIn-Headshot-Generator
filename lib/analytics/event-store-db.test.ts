/**
 * Tests for the `getQuotaBlockedSummaryDb` aggregator.
 *
 * We mock `createServiceClient` so the function reads from an in-memory row
 * set instead of Supabase. The aggregator owns its own date math + bucketing,
 * so feeding it timestamps + slugs is enough to validate the rollup.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

type Row = { trend_slug: string; occurred_at: string }

let mockRows: Row[] = []
let mockError: { code: string; message: string } | null = null

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => {
    // Builder chain: .from('trend_events').select(...).eq('type', 'quota_blocked').gte('occurred_at', iso)
    // The awaited builder returns { data, error }.
    const chain: Record<string, unknown> = {}
    const passthrough = () => chain
    chain.from = vi.fn(passthrough)
    chain.select = vi.fn(passthrough)
    chain.eq = vi.fn(passthrough)
    chain.gte = vi.fn(passthrough)
    chain.then = (resolve: (v: { data: Row[]; error: typeof mockError }) => unknown) =>
      Promise.resolve({ data: mockRows, error: mockError }).then(resolve)
    return chain
  }),
}))

import { getQuotaBlockedSummaryDb } from './event-store-db'

beforeEach(() => {
  mockRows = []
  mockError = null
})

describe('getQuotaBlockedSummaryDb', () => {
  it('returns all-zeros + 7-day zero series when the table is empty', async () => {
    const result = await getQuotaBlockedSummaryDb(24)
    expect(result.totalBlocks).toBe(0)
    expect(result.distinctSlugs).toBe(0)
    expect(result.distinctUsersEstimated).toBe(0)
    expect(result.dailySeries).toHaveLength(7)
    for (const point of result.dailySeries) {
      expect(point.count).toBe(0)
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(point.label).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)
    }
  })

  it('aggregates 5 rows across 3 distinct slugs correctly inside the window', async () => {
    const now = new Date().toISOString()
    mockRows = [
      { trend_slug: 'a', occurred_at: now },
      { trend_slug: 'a', occurred_at: now },
      { trend_slug: 'b', occurred_at: now },
      { trend_slug: 'c', occurred_at: now },
      { trend_slug: 'c', occurred_at: now },
    ]
    const result = await getQuotaBlockedSummaryDb(24)
    expect(result.totalBlocks).toBe(5)
    expect(result.distinctSlugs).toBe(3)
    // Heuristic: distinctUsersEstimated = round(totalBlocks * 0.7) = 4
    expect(result.distinctUsersEstimated).toBe(Math.round(5 * 0.7))
    expect(result.dailySeries).toHaveLength(7)
  })

  it('only counts rows within `windowHours` for totalBlocks/distinctSlugs', async () => {
    const now = Date.now()
    const insideWindow = new Date(now - 1000 * 60 * 60).toISOString() // 1h ago
    const outsideWindow = new Date(now - 1000 * 60 * 60 * 48).toISOString() // 48h ago
    mockRows = [
      { trend_slug: 'a', occurred_at: insideWindow },
      { trend_slug: 'b', occurred_at: outsideWindow },
      { trend_slug: 'c', occurred_at: outsideWindow },
    ]
    const result = await getQuotaBlockedSummaryDb(24)
    expect(result.totalBlocks).toBe(1)
    expect(result.distinctSlugs).toBe(1)
  })

  it('returns empty shape on Supabase error', async () => {
    mockError = { code: 'PGRST116', message: 'permission denied' }
    mockRows = []
    const result = await getQuotaBlockedSummaryDb(24)
    expect(result.totalBlocks).toBe(0)
    expect(result.distinctSlugs).toBe(0)
    expect(result.dailySeries).toHaveLength(7)
  })
})
