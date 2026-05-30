import { beforeEach, describe, expect, it } from 'vitest'
import { createTestTrend, getSql, resetTables } from './db'

/**
 * Red-team C3: anonymous_attempts must enforce 1-per-fingerprint AND
 * 1-per-IP. Composite (fingerprint, ip) UNIQUE was bypassable by
 * rotating either alone.
 */
describe('anonymous_attempts per-field UNIQUE', () => {
  beforeEach(async () => {
    await resetTables(['anonymous_attempts', 'trend_eval_runs', 'trend_eval_inputs', 'trends'])
  })

  it('blocks duplicate fingerprint even with new IP', async () => {
    const trend = await createTestTrend({})
    const sql = getSql()

    await sql`
      insert into public.anonymous_attempts (fingerprint_hash, ip_hash, trend_id)
      values ('fp-1', 'ip-A', ${trend.id})
    `

    await expect(
      sql`
        insert into public.anonymous_attempts (fingerprint_hash, ip_hash, trend_id)
        values ('fp-1', 'ip-B', ${trend.id})
      `,
    ).rejects.toThrow(/duplicate key|unique/i)
  })

  it('blocks duplicate IP even with new fingerprint', async () => {
    const trend = await createTestTrend({})
    const sql = getSql()

    await sql`
      insert into public.anonymous_attempts (fingerprint_hash, ip_hash, trend_id)
      values ('fp-1', 'ip-A', ${trend.id})
    `

    await expect(
      sql`
        insert into public.anonymous_attempts (fingerprint_hash, ip_hash, trend_id)
        values ('fp-2', 'ip-A', ${trend.id})
      `,
    ).rejects.toThrow(/duplicate key|unique/i)
  })

  it('allows different fingerprint + different IP', async () => {
    const trend = await createTestTrend({})
    const sql = getSql()

    await sql`
      insert into public.anonymous_attempts (fingerprint_hash, ip_hash, trend_id)
      values ('fp-1', 'ip-A', ${trend.id})
    `
    await sql`
      insert into public.anonymous_attempts (fingerprint_hash, ip_hash, trend_id)
      values ('fp-2', 'ip-B', ${trend.id})
    `

    const rows = await sql<{ count: number }[]>`
      select count(*)::int from public.anonymous_attempts where trend_id = ${trend.id}
    `
    expect(rows[0].count).toBe(2)
  })
})
