/**
 * Integration-suite global setup. Runs once per worker.
 *
 * Verifies the local Supabase stack is reachable before any test runs.
 * If it isn't, fail loud with a single actionable error — the rest of
 * the suite would otherwise emit dozens of opaque `ECONNREFUSED`s.
 *
 * Default port from `supabase/config.toml`: 54322. Override via
 * INTEGRATION_DATABASE_URL when running against a different stack
 * (e.g. CI shadow DB).
 */

import { afterAll, beforeAll } from 'vitest'
import { getSql, closeSql, defaultDatabaseUrl } from './db'

beforeAll(async () => {
  const url = process.env.INTEGRATION_DATABASE_URL ?? defaultDatabaseUrl()
  const sql = getSql()
  try {
    await sql`select 1 as ok`
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Integration suite cannot connect to ${url}. ` +
        `Run \`pnpm supabase:start\` first (or set INTEGRATION_DATABASE_URL to a reachable Postgres). ` +
        `Underlying error: ${msg}`,
    )
  }
})

afterAll(async () => {
  await closeSql()
})
