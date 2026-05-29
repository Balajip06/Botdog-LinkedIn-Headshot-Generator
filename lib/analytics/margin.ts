/**
 * Daily-margin summary for the admin dashboard.
 *
 * Reads from `generations.cost_usd` (real Gemini calls after creds land) and
 * `webhook_events` (Stripe revenue) where available. Falls back to a
 * deterministic mock so the admin tile renders meaningfully during dev /
 * pre-launch when both data sources are empty.
 *
 * Swap the mock branch for real per-day SQL aggregates when Stripe revenue
 * has flow — the external contract (getMarginSummary) stays stable.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface MarginSummary {
  weekSpendUsd: number
  weekRevenueUsd: number
  weekGenerations: number
  avgCostUsd: number
  marginPct: number
  topTrendTitle: string | null
  topTrendSpendUsd: number
  isMock: boolean
}

const MOCK_SUMMARY: Omit<MarginSummary, 'isMock'> = {
  // Deterministic week-1 numbers. Designed to read like a slow-but-healthy
  // launch so the dashboard feels alive before real traffic.
  weekSpendUsd: 14.62,
  weekRevenueUsd: 89.95,
  weekGenerations: 612,
  avgCostUsd: 0.0239,
  marginPct: 83.7,
  topTrendTitle: 'Action figure in box',
  topTrendSpendUsd: 4.18,
}

interface GenerationRow {
  cost_usd: number | null
  trend_id: string
}

interface TrendBriefRow {
  id: string
  title: string
}

interface WebhookEventRow {
  payload: { amount_total?: number } | null
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function getMarginSummary(
  supabase: SupabaseClient
): Promise<MarginSummary> {
  const weekStart = new Date(Date.now() - ONE_WEEK_MS).toISOString()

  const [{ data: genData }, { data: webhookData }] = await Promise.all([
    supabase
      .from('generations')
      .select('cost_usd, trend_id')
      .eq('status', 'completed')
      .gte('created_at', weekStart),
    supabase
      .from('webhook_events')
      .select('payload')
      .eq('source', 'stripe')
      .gte('created_at', weekStart),
  ])

  const generations = (genData as unknown as GenerationRow[] | null) ?? []
  const webhooks = (webhookData as unknown as WebhookEventRow[] | null) ?? []

  if (generations.length === 0 && webhooks.length === 0) {
    return { ...MOCK_SUMMARY, isMock: true }
  }

  const weekSpendUsd = generations.reduce((sum, g) => sum + Number(g.cost_usd ?? 0), 0)
  const weekGenerations = generations.length
  const avgCostUsd = weekGenerations > 0 ? weekSpendUsd / weekGenerations : 0

  // Stripe `amount_total` is in cents on the checkout.session payload.
  const weekRevenueUsd =
    webhooks.reduce((sum, e) => sum + (e.payload?.amount_total ?? 0), 0) / 100

  const marginPct =
    weekRevenueUsd > 0 ? ((weekRevenueUsd - weekSpendUsd) / weekRevenueUsd) * 100 : 0

  // Spend per trend → top spender
  const spendByTrend = new Map<string, number>()
  for (const g of generations) {
    spendByTrend.set(g.trend_id, (spendByTrend.get(g.trend_id) ?? 0) + Number(g.cost_usd ?? 0))
  }

  let topTrendId: string | null = null
  let topTrendSpendUsd = 0
  for (const [id, spend] of spendByTrend) {
    if (spend > topTrendSpendUsd) {
      topTrendId = id
      topTrendSpendUsd = spend
    }
  }

  let topTrendTitle: string | null = null
  if (topTrendId) {
    const { data: trendRow } = await supabase
      .from('trends')
      .select('id, title')
      .eq('id', topTrendId)
      .maybeSingle()
    topTrendTitle = (trendRow as unknown as TrendBriefRow | null)?.title ?? null
  }

  return {
    weekSpendUsd,
    weekRevenueUsd,
    weekGenerations,
    avgCostUsd,
    marginPct,
    topTrendTitle,
    topTrendSpendUsd,
    isMock: false,
  }
}
