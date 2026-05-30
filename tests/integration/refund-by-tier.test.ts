import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createTestTrend, createTestUser, getSql, resetTables } from './db'

/**
 * Red-team L2: refund_quota_on_failure must restore the counter that
 * was originally debited (per tier_at_generation snapshot), not the
 * "whichever is nonzero" heuristic. Edge case: user with both credits
 * and free slots; a paid generation that fails must restore the
 * credit, not the free slot.
 */
describe('refund_quota_on_failure (tier-driven)', () => {
  beforeEach(async () => {
    await resetTables(['generations', 'trend_eval_runs', 'trend_eval_inputs', 'trends', 'profiles'])
    const sql = getSql()
    await sql.unsafe(`delete from auth.users where email like 'int-%@test.local'`)
  })

  it('credit-tier failure refunds credits_balance, leaves free_used unchanged', async () => {
    const user = await createTestUser({ credits: 2, freeUsed: 1 })
    const trend = await createTestTrend({})
    const sql = getSql()

    const genId = randomUUID()
    await sql.unsafe(
      `insert into public.generations (id, user_id, trend_id, trend_version, idempotency_key, input_payload)
       values ('${genId}', '${user.id}', '${trend.id}', 1, 'k', '{}'::jsonb)`,
    )
    // After insert: credits=1, freeUsed=1, tier=credit.
    await sql.unsafe(`update public.generations set status = 'failed' where id = '${genId}'`)

    const [profile] = await sql<{ credits_balance: number; free_used_this_week: number }[]>`
      select credits_balance, free_used_this_week from public.profiles where id = ${user.id}
    `
    expect(profile.credits_balance).toBe(2)
    expect(profile.free_used_this_week).toBe(1)
  })

  it('free-tier failure refunds free_used_this_week, leaves credits unchanged', async () => {
    const user = await createTestUser({ credits: 0, freeUsed: 3 })
    const trend = await createTestTrend({})
    const sql = getSql()

    const genId = randomUUID()
    await sql.unsafe(
      `insert into public.generations (id, user_id, trend_id, trend_version, idempotency_key, input_payload)
       values ('${genId}', '${user.id}', '${trend.id}', 1, 'k', '{}'::jsonb)`,
    )
    // After insert: credits=0, freeUsed=4, tier=free.
    await sql.unsafe(`update public.generations set status = 'failed' where id = '${genId}'`)

    const [profile] = await sql<{ credits_balance: number; free_used_this_week: number }[]>`
      select credits_balance, free_used_this_week from public.profiles where id = ${user.id}
    `
    expect(profile.credits_balance).toBe(0)
    expect(profile.free_used_this_week).toBe(3)
  })

  it('vip-tier failure does not refund anything', async () => {
    const user = await createTestUser({ credits: 0, freeUsed: 5, isVip: true })
    const trend = await createTestTrend({})
    const sql = getSql()

    const genId = randomUUID()
    await sql.unsafe(
      `insert into public.generations (id, user_id, trend_id, trend_version, idempotency_key, input_payload)
       values ('${genId}', '${user.id}', '${trend.id}', 1, 'k', '{}'::jsonb)`,
    )
    await sql.unsafe(`update public.generations set status = 'failed' where id = '${genId}'`)

    const [profile] = await sql<{ credits_balance: number; free_used_this_week: number }[]>`
      select credits_balance, free_used_this_week from public.profiles where id = ${user.id}
    `
    expect(profile.credits_balance).toBe(0)
    expect(profile.free_used_this_week).toBe(5)
  })
})
