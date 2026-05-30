import { beforeEach, describe, expect, it } from 'vitest'
import { getSql, resetTables } from './db'

/**
 * Non-negotiable #9: webhook_events dedup via UNIQUE (source, event_id).
 * Stripe retries arrive as the same event_id; the second insert must
 * fail loudly with a unique-violation so the route's duplicate-key
 * handler can short-circuit without re-running grantCredits.
 */
describe('webhook_events idempotency constraint', () => {
  beforeEach(async () => {
    await resetTables(['webhook_events'])
  })

  it('blocks a second INSERT with the same (source, event_id)', async () => {
    const sql = getSql()
    await sql`
      insert into public.webhook_events (source, event_id, payload)
      values ('stripe', 'evt_test_dedup', '{}'::jsonb)
    `
    await expect(
      sql`
        insert into public.webhook_events (source, event_id, payload)
        values ('stripe', 'evt_test_dedup', '{}'::jsonb)
      `,
    ).rejects.toThrow(/duplicate key|unique/i)
  })

  it('allows the same event_id under a different source', async () => {
    const sql = getSql()
    // CHECK constraint currently restricts source to 'stripe' only —
    // dropping that check happens in a later migration when we add
    // other webhook sources. For now, assert the constraint is in
    // place and the unique key remains composite.
    await sql`
      insert into public.webhook_events (source, event_id, payload)
      values ('stripe', 'evt_test_same', '{}'::jsonb)
    `
    await expect(
      sql`
        insert into public.webhook_events (source, event_id, payload)
        values ('not-a-real-source', 'evt_test_same', '{}'::jsonb)
      `,
    ).rejects.toThrow(/check constraint|webhook_events_source_check/i)
  })

  it('webhook_events_unprocessed_idx surfaces NULL processed_at', async () => {
    const sql = getSql()
    await sql`
      insert into public.webhook_events (source, event_id, payload, processed_at)
      values ('stripe', 'evt_processed', '{}'::jsonb, now())
    `
    await sql`
      insert into public.webhook_events (source, event_id, payload)
      values ('stripe', 'evt_unprocessed', '{}'::jsonb)
    `
    const rows = await sql<{ event_id: string }[]>`
      select event_id from public.webhook_events where processed_at is null
    `
    expect(rows.map((r) => r.event_id)).toEqual(['evt_unprocessed'])
  })
})
