/**
 * Shared types for the event-store routers. Lives in its own file to keep
 * `event-store.ts` (sync mock + async router) and `event-store-db.ts`
 * (real Supabase backend) free of cyclic imports.
 */

export type TrendEventType = 'impression' | 'click_generate' | 'quota_blocked'

export interface Counts {
  impressions: number
  clicks: number
}

export interface DailyPoint {
  /** ISO date (YYYY-MM-DD) for the bucket — UTC. */
  date: string
  /** Short label, e.g. "Mon" or "May 28", for axis rendering. */
  label: string
  impressions: number
  clicks: number
}

/**
 * Summary of quota-blocked generation attempts over a window.
 * Emitted via the `consume_quota_on_generation_insert` trigger (Agent 1
 * migration) when a free-tier user with no credits + 5/week cap hit
 * tries to insert into `generations` and gets blocked at the RLS layer.
 */
export interface QuotaBlockedSummary {
  /** Total `quota_blocked` events in the requested window. */
  totalBlocks: number
  /** Distinct trend slugs that produced a block. */
  distinctSlugs: number
  /**
   * Approximated distinct-user count.
   * TODO: switch to actual distinct-user count when /api/track persists user_id.
   */
  distinctUsersEstimated: number
  /** Always 7d for the sparkline regardless of `windowHours`. */
  dailySeries: { date: string; label: string; count: number }[]
}
