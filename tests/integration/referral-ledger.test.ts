import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createTestTrend, createTestUser, getSql, resetTables } from './db'

/**
 * Red-team M6: referral_rewards ledger must prevent delete+recreate
 * farming. Same (referrer_id, email_hash) pair cannot earn credits
 * twice even if the referee profile is fully deleted between cycles.
 */
describe('referral_rewards ledger', () => {
  beforeEach(async () => {
    await resetTables([
      'referral_rewards',
      'referrals',
      'generations',
      'profiles',
    ])
    const sql = getSql()
    await sql.unsafe(`delete from auth.users where email like 'int-%@test.local'`)
  })

  it('first reward grants credits and writes ledger row', async () => {
    const referrer = await createTestUser({ credits: 0 })
    const referee = await createTestUser({ credits: 0, referredBy: referrer.id })
    const trend = await createTestTrend({})
    const sql = getSql()

    await sql.unsafe(
      `insert into public.referrals (referrer_id, referred_id, status)
       values ('${referrer.id}', '${referee.id}', 'pending')`,
    )

    const genId = randomUUID()
    // Insert + transition to completed to fire maybe_reward_referral.
    // Service-role bypasses RLS; quota trigger consumes a free slot.
    await sql.unsafe(
      `insert into public.generations (id, user_id, trend_id, trend_version, idempotency_key, input_payload, status)
       values ('${genId}', '${referee.id}', '${trend.id}', 1, 'k-${genId}', '{}'::jsonb, 'pending')`,
    )
    await sql.unsafe(`update public.generations set status = 'completed' where id = '${genId}'`)

    const [profile] = await sql<{ credits_balance: number; bonus_credits_earned: number }[]>`
      select credits_balance, bonus_credits_earned from public.profiles where id = ${referrer.id}
    `
    expect(profile.credits_balance).toBe(10)
    expect(profile.bonus_credits_earned).toBe(10)

    const ledger = await sql<{ referrer_id: string; referee_email_hash: string }[]>`
      select referrer_id, referee_email_hash from public.referral_rewards
       where referrer_id = ${referrer.id}
    `
    expect(ledger.length).toBe(1)
    expect(ledger[0].referrer_id).toBe(referrer.id)
  })

  it('delete+recreate same email does not re-credit the referrer', async () => {
    const referrer = await createTestUser({ credits: 0 })
    const refereeEmail = `int-cycle-${randomUUID().slice(0, 8)}@test.local`
    const referee1 = await createTestUser({
      email: refereeEmail,
      credits: 0,
      referredBy: referrer.id,
    })
    const trend = await createTestTrend({})
    const sql = getSql()

    // First cycle: complete a generation → referrer earns 10.
    await sql.unsafe(
      `insert into public.referrals (referrer_id, referred_id, status)
       values ('${referrer.id}', '${referee1.id}', 'pending')`,
    )
    const gen1 = randomUUID()
    await sql.unsafe(
      `insert into public.generations (id, user_id, trend_id, trend_version, idempotency_key, input_payload, status)
       values ('${gen1}', '${referee1.id}', '${trend.id}', 1, 'k1', '{}'::jsonb, 'pending')`,
    )
    await sql.unsafe(`update public.generations set status = 'completed' where id = '${gen1}'`)

    // Hard-delete referee1's auth row (cascades through profiles +
    // referrals). Simulates the GDPR purge cron at 30d.
    await sql.unsafe(`delete from auth.users where id = '${referee1.id}'`)

    // Same email re-signs up — fresh auth.users.id, fresh profile.
    const referee2 = await createTestUser({
      email: refereeEmail,
      credits: 0,
      referredBy: referrer.id,
    })
    await sql.unsafe(
      `insert into public.referrals (referrer_id, referred_id, status)
       values ('${referrer.id}', '${referee2.id}', 'pending')`,
    )
    const gen2 = randomUUID()
    await sql.unsafe(
      `insert into public.generations (id, user_id, trend_id, trend_version, idempotency_key, input_payload, status)
       values ('${gen2}', '${referee2.id}', '${trend.id}', 1, 'k2', '{}'::jsonb, 'pending')`,
    )
    await sql.unsafe(`update public.generations set status = 'completed' where id = '${gen2}'`)

    // Referrer balance must NOT have doubled — the ledger row from
    // cycle 1 (keyed on referrer_id + sha256(email)) is still present
    // and blocks the second credit grant.
    const [profile] = await sql<{ credits_balance: number; bonus_credits_earned: number }[]>`
      select credits_balance, bonus_credits_earned from public.profiles where id = ${referrer.id}
    `
    expect(profile.credits_balance).toBe(10)
    expect(profile.bonus_credits_earned).toBe(10)

    // Second referral row IS marked rewarded (signup completed) but no
    // ledger row added.
    const ledger = await sql<{ count: number }[]>`
      select count(*)::int from public.referral_rewards
       where referrer_id = ${referrer.id}
    `
    expect(ledger[0].count).toBe(1)
  })
})
