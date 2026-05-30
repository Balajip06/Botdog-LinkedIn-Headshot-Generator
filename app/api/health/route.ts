import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface HealthBody {
  ok: boolean
  ts: string
  version: string | null
  checks: {
    db: 'ok' | 'fail'
    db_latency_ms: number | null
  }
}

/**
 * Liveness + readiness probe. Returns 200 only when Supabase responds; the
 * uptime monitor pings this every 5 min and alerts on two consecutive failures.
 * Kept lean — no auth, no rate limit. Safe to expose because no sensitive data
 * leaks (only a boolean + latency).
 */
export async function GET() {
  const started = Date.now()
  let dbOk = false
  let dbLatency: number | null = null

  try {
    const supabase = createServiceClient()
    // HEAD count against a small table — cheapest possible round-trip that
    // proves the DB is reachable and credentials are valid.
    const { error } = await supabase
      .from('trends')
      .select('id', { count: 'exact', head: true })
    dbOk = !error
    dbLatency = Date.now() - started
  } catch {
    dbOk = false
    dbLatency = Date.now() - started
  }

  const body: HealthBody = {
    ok: dbOk,
    ts: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    checks: {
      db: dbOk ? 'ok' : 'fail',
      db_latency_ms: dbLatency,
    },
  }

  return NextResponse.json(body, { status: dbOk ? 200 : 503 })
}
