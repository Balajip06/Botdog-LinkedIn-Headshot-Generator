/**
 * Tests for `funnel.ts` — mock fallback, forceMock, and live-shape aggregation
 * (stage counts, distinct-paid de-dup, conversions, daily series).
 */

import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAcquisitionFunnel, getActiveSubscribers } from './funnel'

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

type Rows = Record<string, unknown[]>

/** Client whose reads resolve per-table. Each `from(table)` gets its own chain
 * so Promise.all over multiple tables doesn't race on shared state. */
function makeClient(byTable: Rows): SupabaseClient {
  function builder(table: string): Record<string, unknown> {
    const rows = byTable[table] ?? []
    const result = { data: rows, error: null, count: rows.length }
    const chain: Record<string, unknown> = {}
    const pass = () => chain
    chain.select = vi.fn(pass)
    chain.gte = vi.fn(pass)
    chain.eq = vi.fn(pass)
    chain.in = vi.fn(pass)
    chain.order = vi.fn(pass)
    chain.limit = vi.fn(pass)
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: rows[0] ?? null, error: null }))
    chain.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve)
    return chain
  }
  return { from: vi.fn((t: string) => builder(t)) } as unknown as SupabaseClient
}

const emptyClient = (): SupabaseClient => makeClient({})

describe('getAcquisitionFunnel — mock path', () => {
  it('falls back to mock when all sources empty', async () => {
    const funnel = await getAcquisitionFunnel(emptyClient(), 7)
    expect(funnel.isMock).toBe(true)
    expect(funnel.stages).toHaveLength(6)
    // Funnel is monotonically non-increasing.
    for (let i = 0; i < funnel.stages.length - 1; i++) {
      expect(funnel.stages[i].count).toBeGreaterThanOrEqual(funnel.stages[i + 1].count)
    }
  })

  it('forceMock skips DB and returns descending funnel', async () => {
    const funnel = await getAcquisitionFunnel(emptyClient(), 30, { forceMock: true })
    expect(funnel.isMock).toBe(true)
    expect(funnel.stages[0].count).toBeGreaterThanOrEqual(funnel.stages[5].count)
  })

  it('daily series has one point per day with ISO dates', async () => {
    const funnel = await getAcquisitionFunnel(emptyClient(), 7, { forceMock: true })
    expect(funnel.daily).toHaveLength(7)
    for (const p of funnel.daily) expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('has 5 ordered conversions with rates in [0,1]', async () => {
    const funnel = await getAcquisitionFunnel(emptyClient(), 7, { forceMock: true })
    expect(funnel.conversions).toHaveLength(5)
    for (const c of funnel.conversions) {
      expect(c.rate).toBeGreaterThanOrEqual(0)
      expect(c.rate).toBeLessThanOrEqual(1)
    }
    // toKey of each step is the fromKey of the next.
    for (let i = 0; i < funnel.conversions.length - 1; i++) {
      expect(funnel.conversions[i].toKey).toBe(funnel.conversions[i + 1].fromKey)
    }
  })

  it('emailToPaidRate ≈ paid / emails in mock', async () => {
    const funnel = await getAcquisitionFunnel(emptyClient(), 7, { forceMock: true })
    expect(funnel.emailToPaidRate).toBeCloseTo(funnel.paidUsers / funnel.emailsCaptured, 5)
  })
})

describe('getAcquisitionFunnel — live shape', () => {
  const now = new Date().toISOString()

  it('counts each stage from seeded rows and de-dupes paid users', async () => {
    const client = makeClient({
      anonymous_attempts: [
        { status: 'completed', created_at: now, claimed_by: 'u1' },
        { status: 'completed', created_at: now, claimed_by: null },
        { status: 'failed', created_at: now, claimed_by: null },
      ],
      email_leads: [{ created_at: now }, { created_at: now }],
      profiles: [
        { created_at: now },
        { created_at: now },
        { created_at: now },
        { created_at: now },
      ],
      webhook_events: [
        { payload: { metadata: { kind: 'subscription', user_id: 'u1' } }, created_at: now },
        // duplicate user — must not double-count
        { payload: { metadata: { kind: 'subscription', user_id: 'u1' } }, created_at: now },
        { payload: { metadata: { kind: 'subscription', user_id: 'u2' } }, created_at: now },
        // pack purchase (not a subscription) — must NOT count as paid
        { payload: { metadata: { kind: 'pack', user_id: 'u3' } }, created_at: now },
      ],
    })

    const funnel = await getAcquisitionFunnel(client, 7)
    expect(funnel.isMock).toBe(false)
    const byKey = Object.fromEntries(funnel.stages.map((s) => [s.key, s.count]))
    expect(byKey.anon_created).toBe(3)
    expect(byKey.anon_completed).toBe(2)
    expect(byKey.email_entered).toBe(2)
    expect(byKey.account_created).toBe(4)
    expect(byKey.trial_claimed).toBe(1)
    expect(byKey.paid).toBe(2) // u1 (deduped) + u2, not u3
    expect(funnel.paidUsers).toBe(2)
    expect(funnel.emailsCaptured).toBe(2)
  })

  it('emailToPaidRate is 0 when no emails captured', async () => {
    const client = makeClient({
      anonymous_attempts: [{ status: 'completed', created_at: now, claimed_by: null }],
    })
    const funnel = await getAcquisitionFunnel(client, 7)
    expect(funnel.isMock).toBe(false)
    expect(funnel.emailsCaptured).toBe(0)
    expect(funnel.emailToPaidRate).toBe(0)
  })
})

describe('getActiveSubscribers', () => {
  it('forceMock returns a positive mock count', async () => {
    const res = await getActiveSubscribers(emptyClient(), { forceMock: true })
    expect(res.isMock).toBe(true)
    expect(res.count).toBeGreaterThan(0)
  })

  it('returns the live count when active subscribers exist', async () => {
    const client = makeClient({ profiles: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] })
    const res = await getActiveSubscribers(client)
    expect(res.isMock).toBe(false)
    expect(res.count).toBe(3)
  })
})
