/**
 * Acquisition-funnel summary for the admin dashboard.
 *
 * Tracks the in-card growth funnel end-to-end:
 *   1. anon_created     — anonymous trial started      (anonymous_attempts)
 *   2. anon_completed   — trial headshot finished       (status='completed')
 *   3. email_entered    — email captured for "more"     (email_leads)
 *   4. account_created  — magic-link signup completed   (profiles)
 *   5. trial_claimed    — trial adopted into account    (anonymous_attempts.claimed_by)
 *   6. paid             — subscribed to the Botdog plan  (webhook_events, subscription)
 *
 * "Paid" is sourced from `webhook_events` ONLY (distinct subscription-checkout
 * user_ids) — never from `admin_audit_log` credit grants, which include
 * manual/refund grants and would double-count.
 *
 * Aggregation is done in TS (matching margin.ts). Falls back to a deterministic
 * mock so the admin page renders meaningfully before real traffic.
 */

import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

export type FunnelStageKey =
  | 'anon_created'
  | 'anon_completed'
  | 'email_entered'
  | 'account_created'
  | 'trial_claimed'
  | 'paid'

export interface FunnelStage {
  key: FunnelStageKey
  label: string
  count: number
}

export interface FunnelConversion {
  fromKey: FunnelStageKey
  toKey: FunnelStageKey
  fromCount: number
  toCount: number
  /** toCount / fromCount, 0 when fromCount === 0. */
  rate: number
}

export interface FunnelDailyPoint {
  /** ISO date (YYYY-MM-DD) for the UTC day. */
  date: string
  /** Short axis label, e.g. "Mon". */
  label: string
  anonCreated: number
  emailEntered: number
  accountCreated: number
  paid: number
}

export interface AcquisitionFunnel {
  rangeDays: number
  stages: FunnelStage[]
  conversions: FunnelConversion[]
  daily: FunnelDailyPoint[]
  emailsCaptured: number
  paidUsers: number
  /** paidUsers / emailsCaptured, 0 when emailsCaptured === 0. */
  emailToPaidRate: number
  isMock: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const STAGE_LABELS: Record<FunnelStageKey, string> = {
  anon_created: 'Anonymous tries',
  anon_completed: 'Headshots generated',
  email_entered: 'Emails captured',
  account_created: 'Accounts created',
  trial_claimed: 'Trials claimed',
  paid: 'Subscribed',
}

const STAGE_ORDER: FunnelStageKey[] = [
  'anon_created',
  'anon_completed',
  'email_entered',
  'account_created',
  'trial_claimed',
  'paid',
]

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function djb2(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return Math.abs(hash)
}

function emptyDays(days: number): FunnelDailyPoint[] {
  const today = startOfUtcDay(new Date())
  return Array.from({ length: days }, (_, idx) => {
    const d = new Date(today.getTime() - (days - 1 - idx) * DAY_MS)
    return {
      date: d.toISOString().slice(0, 10),
      label: WEEKDAY_LABELS[d.getUTCDay()],
      anonCreated: 0,
      emailEntered: 0,
      accountCreated: 0,
      paid: 0,
    }
  })
}

// Deterministic descending funnel for the empty/pre-launch state.
const MOCK_STAGE_COUNTS: Record<FunnelStageKey, number> = {
  anon_created: 1000,
  anon_completed: 720,
  email_entered: 410,
  account_created: 360,
  trial_claimed: 250,
  paid: 41,
}

function buildConversions(stages: FunnelStage[]): FunnelConversion[] {
  const out: FunnelConversion[] = []
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i]
    const to = stages[i + 1]
    out.push({
      fromKey: from.key,
      toKey: to.key,
      fromCount: from.count,
      toCount: to.count,
      rate: from.count > 0 ? to.count / from.count : 0,
    })
  }
  return out
}

function mockDaily(days: number): FunnelDailyPoint[] {
  const series = emptyDays(days)
  // Gentle uptick + jitter so the chart reads alive, mirroring margin's curve.
  const weights: number[] = []
  let weightTotal = 0
  for (let i = 0; i < days; i++) {
    const trend = 0.6 + (i / Math.max(1, days - 1)) * 0.8
    const jitter = ((djb2(`funnel:${i}`) % 100) / 100) * 0.5 + 0.75
    const w = trend * jitter
    weights.push(w)
    weightTotal += w
  }
  for (let i = 0; i < days; i++) {
    const share = weights[i] / weightTotal
    series[i].anonCreated = Math.round(MOCK_STAGE_COUNTS.anon_created * share)
    series[i].emailEntered = Math.round(MOCK_STAGE_COUNTS.email_entered * share)
    series[i].accountCreated = Math.round(MOCK_STAGE_COUNTS.account_created * share)
    series[i].paid = Math.round(MOCK_STAGE_COUNTS.paid * share)
  }
  return series
}

function mockFunnel(days: number): AcquisitionFunnel {
  const stages = STAGE_ORDER.map((key) => ({
    key,
    label: STAGE_LABELS[key],
    count: MOCK_STAGE_COUNTS[key],
  }))
  return {
    rangeDays: days,
    stages,
    conversions: buildConversions(stages),
    daily: mockDaily(days),
    emailsCaptured: MOCK_STAGE_COUNTS.email_entered,
    paidUsers: MOCK_STAGE_COUNTS.paid,
    emailToPaidRate: MOCK_STAGE_COUNTS.paid / MOCK_STAGE_COUNTS.email_entered,
    isMock: true,
  }
}

interface AnonRow {
  status: string | null
  created_at: string | null
  claimed_by: string | null
}
interface EmailLeadRow {
  created_at: string | null
}
interface ProfileRow {
  created_at: string | null
}
interface WebhookRow {
  payload: { metadata?: { user_id?: string; kind?: string } } | null
  created_at: string | null
}

/**
 * 6-stage acquisition funnel for the supplied window (default 7 days, UTC-aligned).
 * Returns deterministic mock data when all four sources are empty or `forceMock`.
 */
export async function getAcquisitionFunnel(
  supabase: SupabaseClient,
  days = 7,
  options?: { forceMock?: boolean }
): Promise<AcquisitionFunnel> {
  if (options?.forceMock) return mockFunnel(days)

  const today = startOfUtcDay(new Date())
  const since = new Date(today.getTime() - (days - 1) * DAY_MS)
  const sinceIso = since.toISOString()

  try {
    const [{ data: anonRows }, { data: leadRows }, { data: profileRows }, { data: webhookRows }] =
      await Promise.all([
        supabase
          .from('anonymous_attempts')
          .select('status, created_at, claimed_by')
          .gte('created_at', sinceIso),
        supabase.from('email_leads').select('created_at').gte('created_at', sinceIso),
        supabase.from('profiles').select('created_at').gte('created_at', sinceIso),
        supabase
          .from('webhook_events')
          .select('payload, created_at')
          .eq('source', 'stripe')
          .gte('created_at', sinceIso),
      ])

    const anon = (anonRows as unknown as AnonRow[] | null) ?? []
    const leads = (leadRows as unknown as EmailLeadRow[] | null) ?? []
    const profiles = (profileRows as unknown as ProfileRow[] | null) ?? []
    const webhooks = (webhookRows as unknown as WebhookRow[] | null) ?? []

    if (anon.length === 0 && leads.length === 0 && profiles.length === 0 && webhooks.length === 0) {
      return mockFunnel(days)
    }

    // Paid = distinct subscription-checkout user_ids (webhook_events only).
    const paidUserIds = new Set<string>()
    for (const w of webhooks) {
      if (w.payload?.metadata?.kind !== 'subscription') continue
      const uid = w.payload?.metadata?.user_id
      if (uid) paidUserIds.add(uid)
    }

    const counts: Record<FunnelStageKey, number> = {
      anon_created: anon.length,
      anon_completed: anon.filter((a) => a.status === 'completed').length,
      email_entered: leads.length,
      account_created: profiles.length,
      trial_claimed: anon.filter((a) => a.claimed_by != null).length,
      paid: paidUserIds.size,
    }

    const stages = STAGE_ORDER.map((key) => ({ key, label: STAGE_LABELS[key], count: counts[key] }))

    // Daily series.
    const daily = emptyDays(days)
    const byDate = new Map(daily.map((d) => [d.date, d]))
    const bump = (createdAt: string | null, field: keyof FunnelDailyPoint): void => {
      if (!createdAt) return
      const key = startOfUtcDay(new Date(createdAt)).toISOString().slice(0, 10)
      const bucket = byDate.get(key)
      if (bucket && typeof bucket[field] === 'number') {
        ;(bucket[field] as number) += 1
      }
    }
    for (const a of anon) bump(a.created_at, 'anonCreated')
    for (const l of leads) bump(l.created_at, 'emailEntered')
    for (const p of profiles) bump(p.created_at, 'accountCreated')
    for (const w of webhooks) {
      if (w.payload?.metadata?.kind === 'subscription') bump(w.created_at, 'paid')
    }

    return {
      rangeDays: days,
      stages,
      conversions: buildConversions(stages),
      daily,
      emailsCaptured: counts.email_entered,
      paidUsers: counts.paid,
      emailToPaidRate: counts.email_entered > 0 ? counts.paid / counts.email_entered : 0,
      isMock: false,
    }
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { component: 'funnel', op: 'getAcquisitionFunnel' } })
    return mockFunnel(days)
  }
}

/**
 * Point-in-time count of users with an active subscription. Drives the MRR card.
 * Returns a deterministic mock count when the column is empty (pre-launch).
 */
export async function getActiveSubscribers(
  supabase: SupabaseClient,
  options?: { forceMock?: boolean }
): Promise<{ count: number; isMock: boolean }> {
  if (options?.forceMock) return { count: MOCK_STAGE_COUNTS.paid, isMock: true }
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
    if (error) throw error
    if (count == null || count === 0) return { count: MOCK_STAGE_COUNTS.paid, isMock: count == null }
    return { count, isMock: false }
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { component: 'funnel', op: 'getActiveSubscribers' } })
    return { count: MOCK_STAGE_COUNTS.paid, isMock: true }
  }
}
