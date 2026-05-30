import { createHash } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { logAdminAction } from '@/lib/admin/audit'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Dataset = 'customers' | 'generations' | 'revenue'
const DATASETS: readonly Dataset[] = ['customers', 'generations', 'revenue'] as const

// 8-char prefix of the SHA-256 digest is sufficient to render emails / user_ids
// non-PII for buyer-side diligence reconciliation while keeping the CSV
// human-skimmable. ~16M-bucket collision space — fine for at most ~10k rows.
function hashShort(input: string | null | undefined): string {
  if (!input) return ''
  return createHash('sha256').update(input).digest('hex').slice(0, 8)
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v)
  // Always wrap so commas/newlines in payload_json don't break parsing.
  return `"${s.replace(/"/g, '""')}"`
}

function csvLine(values: readonly unknown[]): string {
  return values.map(csvCell).join(',')
}

interface ProfileRow {
  id: string
  email: string
  created_at: string
  credits_balance: number
  bonus_credits_earned: number
  referred_by: string | null
  is_vip: boolean
  deleted_at: string | null
  acquisition_source: { utm_source?: string } | null
}

interface WebhookExportRow {
  event_id: string
  source: string
  payload: {
    amount_total?: number
    currency?: string
    customer_email?: string
    customer_details?: { email?: string }
  } | null
  created_at: string
}

async function buildCustomersCsv(): Promise<{ csv: string; rows: number }> {
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select(
      'id, email, created_at, credits_balance, bonus_credits_earned, referred_by, is_vip, deleted_at, acquisition_source',
    )
  const rows = (data as ProfileRow[] | null) ?? []
  const header = [
    'user_id',
    'email_hash',
    'signup_date',
    'credits_balance',
    'total_credits_purchased',
    'referred_by_id',
    'vip_status',
    'deleted_at',
    'utm_source',
  ]
  const lines: string[] = [csvLine(header)]
  for (const r of rows) {
    // `bonus_credits_earned` is the closest proxy we have for lifetime-purchased
    // credits today; once a dedicated `total_credits_purchased` column lands
    // (W4 ledger work), swap this. Documented in the cell.
    lines.push(
      csvLine([
        r.id,
        hashShort(r.email),
        r.created_at,
        r.credits_balance,
        r.bonus_credits_earned,
        r.referred_by ?? '',
        r.is_vip ? 'vip' : 'standard',
        r.deleted_at ?? '',
        r.acquisition_source?.utm_source ?? '',
      ]),
    )
  }
  return { csv: lines.join('\n'), rows: rows.length }
}

async function buildGenerationsCsv(): Promise<{ csv: string; rows: number }> {
  const service = createServiceClient()
  const { data: genData } = await service
    .from('generations')
    .select('id, user_id, trend_id, status, cost_usd, created_at, completed_at, model_used')
  const rows = genData ?? []

  // One round-trip to resolve trend_id -> slug. Keeps the export human-readable
  // without exposing the internal UUIDs to the buyer.
  const trendIds = Array.from(new Set(rows.map((r) => r.trend_id)))
  const slugById = new Map<string, string>()
  if (trendIds.length > 0) {
    const { data: trendRows } = await service
      .from('trends')
      .select('id, slug')
      .in('id', trendIds)
    for (const t of trendRows ?? []) {
      slugById.set(t.id, t.slug)
    }
  }

  const header = [
    'id',
    'user_id_hash',
    'trend_slug',
    'status',
    'cost_usd',
    'created_at',
    'completed_at',
    'model_used',
  ]
  const lines: string[] = [csvLine(header)]
  for (const r of rows) {
    lines.push(
      csvLine([
        r.id,
        hashShort(r.user_id),
        slugById.get(r.trend_id) ?? r.trend_id,
        r.status,
        r.cost_usd ?? '',
        r.created_at,
        r.completed_at ?? '',
        r.model_used ?? '',
      ]),
    )
  }
  return { csv: lines.join('\n'), rows: rows.length }
}

// Walks the Stripe webhook payload and replaces any `customer_email` field
// (top-level + nested `customer_details.email`) with the SHA-256 short hash.
// Buyer still has reconciliation against their Stripe Dashboard via
// `webhook_event_id`; raw email never leaves our DB through this export.
function redactPayloadEmails(payload: unknown): unknown {
  if (payload === null || typeof payload !== 'object') return payload
  const out: Record<string, unknown> = { ...(payload as Record<string, unknown>) }
  if (typeof out.customer_email === 'string') {
    out.customer_email = hashShort(out.customer_email)
  }
  if (out.customer_details && typeof out.customer_details === 'object') {
    const cd = { ...(out.customer_details as Record<string, unknown>) }
    if (typeof cd.email === 'string') cd.email = hashShort(cd.email)
    out.customer_details = cd
  }
  return out
}

async function buildRevenueCsv(): Promise<{ csv: string; rows: number }> {
  const service = createServiceClient()
  const { data } = await service
    .from('webhook_events')
    .select('event_id, source, payload, created_at')
  const rows = (data as WebhookExportRow[] | null) ?? []
  const header = [
    'webhook_event_id',
    'source',
    'amount_usd',
    'currency',
    'customer_email_hash',
    'created_at',
    'payload_json',
  ]
  const lines: string[] = [csvLine(header)]
  for (const r of rows) {
    const amountCents = r.payload?.amount_total ?? 0
    const email = r.payload?.customer_email ?? r.payload?.customer_details?.email ?? null
    lines.push(
      csvLine([
        r.event_id,
        r.source,
        (amountCents / 100).toFixed(2),
        r.payload?.currency ?? '',
        hashShort(email),
        r.created_at,
        redactPayloadEmails(r.payload) ?? null,
      ]),
    )
  }
  return { csv: lines.join('\n'), rows: rows.length }
}

export async function GET(request: NextRequest): Promise<Response> {
  // Defense-in-depth: middleware (proxy.ts) already gates /admin/*, but we
  // re-verify admin membership here because route handlers don't share that
  // matcher in every Next.js code path (e.g. direct invocation in tests).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!adminRow) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const datasetRaw = request.nextUrl.searchParams.get('dataset')
  if (!datasetRaw || !(DATASETS as readonly string[]).includes(datasetRaw)) {
    return NextResponse.json(
      { error: 'invalid_dataset', allowed: DATASETS },
      { status: 400 },
    )
  }
  const dataset = datasetRaw as Dataset

  // TODO: switch to streaming chunked response when row count > 5k.
  let body: { csv: string; rows: number }
  switch (dataset) {
    case 'customers':
      body = await buildCustomersCsv()
      break
    case 'generations':
      body = await buildGenerationsCsv()
      break
    case 'revenue':
      body = await buildRevenueCsv()
      break
  }

  await logAdminAction({
    adminId: user.id,
    action: 'customer_export',
    targetTable: dataset,
    targetId: null,
    after: { row_count: body.rows, dataset },
  })

  const isoDate = new Date().toISOString().slice(0, 10)
  return new Response(body.csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="trendly-${dataset}-${isoDate}.csv"`,
      'cache-control': 'no-store',
    },
  })
}
