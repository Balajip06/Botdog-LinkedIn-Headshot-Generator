import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { getSql, resetTables } from './db'

/**
 * Red-team H5: trends.eval_status cannot transition to 'passed' unless
 * a matching trend_eval_runs row exists for the current prompt_version
 * with admin_rating = 'pass'.
 */
describe('require_eval_proof_for_passed trigger', () => {
  beforeEach(async () => {
    await resetTables(['trend_eval_runs', 'trend_eval_inputs', 'trends'])
  })

  it('rejects passed when no eval runs exist', async () => {
    const sql = getSql()
    const id = randomUUID()
    await sql.unsafe(
      `insert into public.trends (id, slug, title, prompt_template, eval_status, is_active)
       values ('${id}', 'h5-empty', 't', 'p', 'untested', false)`
    )

    await expect(
      sql.unsafe(`update public.trends set eval_status = 'passed' where id = '${id}'`)
    ).rejects.toThrow(/eval proof missing/)
  })

  it('rejects passed when only failing runs exist', async () => {
    const sql = getSql()
    const trendId = randomUUID()
    await sql.unsafe(
      `insert into public.trends (id, slug, title, prompt_template, eval_status, is_active)
       values ('${trendId}', 'h5-fail', 't', 'p', 'untested', false)`
    )

    const inputId = randomUUID()
    await sql.unsafe(
      `insert into public.trend_eval_inputs (id, trend_id, label, image_url)
       values ('${inputId}', '${trendId}', 'l', 'https://example.test/i.png')`
    )
    await sql.unsafe(
      `insert into public.trend_eval_runs (id, trend_id, prompt_version, eval_input_id, admin_rating)
       values (gen_random_uuid(), '${trendId}', 1, '${inputId}', 'fail')`
    )

    await expect(
      sql.unsafe(`update public.trends set eval_status = 'passed' where id = '${trendId}'`)
    ).rejects.toThrow(/eval proof missing/)
  })

  it('rejects passed when pass run is for a previous prompt_version', async () => {
    const sql = getSql()
    const trendId = randomUUID()
    await sql.unsafe(
      `insert into public.trends (id, slug, title, prompt_template, eval_status, is_active, version)
       values ('${trendId}', 'h5-stale', 't', 'p1', 'untested', false, 1)`
    )
    const inputId = randomUUID()
    await sql.unsafe(
      `insert into public.trend_eval_inputs (id, trend_id, label, image_url)
       values ('${inputId}', '${trendId}', 'l', 'https://example.test/i.png')`
    )
    await sql.unsafe(
      `insert into public.trend_eval_runs (id, trend_id, prompt_version, eval_input_id, admin_rating)
       values (gen_random_uuid(), '${trendId}', 1, '${inputId}', 'pass')`
    )

    // bump_trend_version increments version and forces eval_status back
    // to 'untested', simulating a prompt edit. The pass run from
    // version=1 should NOT count toward version=2.
    await sql.unsafe(`update public.trends set prompt_template = 'p2' where id = '${trendId}'`)

    await expect(
      sql.unsafe(`update public.trends set eval_status = 'passed' where id = '${trendId}'`)
    ).rejects.toThrow(/eval proof missing/)
  })

  it('allows passed when a pass run for the current version exists', async () => {
    const sql = getSql()
    const trendId = randomUUID()
    await sql.unsafe(
      `insert into public.trends (id, slug, title, prompt_template, eval_status, is_active)
       values ('${trendId}', 'h5-ok', 't', 'p', 'untested', false)`
    )
    const inputId = randomUUID()
    await sql.unsafe(
      `insert into public.trend_eval_inputs (id, trend_id, label, image_url)
       values ('${inputId}', '${trendId}', 'l', 'https://example.test/i.png')`
    )
    await sql.unsafe(
      `insert into public.trend_eval_runs (id, trend_id, prompt_version, eval_input_id, admin_rating)
       values (gen_random_uuid(), '${trendId}', 1, '${inputId}', 'pass')`
    )

    await sql.unsafe(`update public.trends set eval_status = 'passed' where id = '${trendId}'`)
    const [row] = await sql<{ eval_status: string }[]>`
      select eval_status from public.trends where id = ${trendId}
    `
    expect(row.eval_status).toBe('passed')
  })

  it('allows demotion passed → failed without proof', async () => {
    const sql = getSql()
    const trendId = randomUUID()
    await sql.unsafe(
      `insert into public.trends (id, slug, title, prompt_template, eval_status, is_active)
       values ('${trendId}', 'h5-demote', 't', 'p', 'untested', false)`
    )
    const inputId = randomUUID()
    await sql.unsafe(
      `insert into public.trend_eval_inputs (id, trend_id, label, image_url)
       values ('${inputId}', '${trendId}', 'l', 'https://example.test/i.png')`
    )
    await sql.unsafe(
      `insert into public.trend_eval_runs (id, trend_id, prompt_version, eval_input_id, admin_rating)
       values (gen_random_uuid(), '${trendId}', 1, '${inputId}', 'pass')`
    )
    await sql.unsafe(`update public.trends set eval_status = 'passed' where id = '${trendId}'`)
    // Now demote — must not require proof.
    await sql.unsafe(`update public.trends set eval_status = 'failed' where id = '${trendId}'`)
    const [row] = await sql<{ eval_status: string }[]>`
      select eval_status from public.trends where id = ${trendId}
    `
    expect(row.eval_status).toBe('failed')
  })
})
