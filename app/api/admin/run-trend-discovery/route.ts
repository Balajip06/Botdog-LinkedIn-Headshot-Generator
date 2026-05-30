/**
 * Weekly trend-discovery trigger.
 *
 * Two callers:
 *   1. Vercel Cron — Monday 08:00 UTC, sends `Authorization: Bearer ${CRON_SECRET}`
 *   2. Admin manual click — authenticated admin session (no header needed)
 *
 * The endpoint runs `runTrendDetector()` against the live source fetchers
 * (Reddit works without keys; TikTok + IG no-op until creds land), then writes
 * an `admin_audit_log` row capturing fetched/deduped/proposed/inserted counts +
 * any per-source errors for review.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { logAdminAction } from '@/lib/admin/audit'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { runTrendDetector } from '@/lib/trends/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = Boolean(cronSecret && auth === `Bearer ${cronSecret}`)

  let adminId: string | null = null

  if (!isCron) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    const svc = createServiceClient()
    const { data } = await svc
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    const admin = data
    if (!admin) {
      return NextResponse.json({ error: 'not_admin' }, { status: 403 })
    }
    adminId = user.id
  }

  const service = createServiceClient()
  const result = await runTrendDetector(service)

  await logAdminAction({
    adminId,
    action: 'trend_discovery_run',
    targetTable: 'trend_suggestions',
    targetId: null,
    after: {
      triggered_by: isCron ? 'cron' : 'admin',
      fetched: result.fetched,
      deduped: result.deduped,
      proposed: result.proposed,
      inserted: result.inserted,
      error_count: result.errors.length,
      errors: result.errors.slice(0, 5),
    },
  })

  return NextResponse.json(result)
}

// Vercel cron hits GET for some configurations — keep parity to avoid 405.
export async function GET(request: NextRequest): Promise<NextResponse> {
  return POST(request)
}
