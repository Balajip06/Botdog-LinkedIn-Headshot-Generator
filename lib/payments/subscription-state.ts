/**
 * Subscription-state writer. Wraps the SECURITY DEFINER `set_subscription_state`
 * SQL function (migration 0033) so the Stripe webhook never pokes the
 * `profiles.subscription_*` columns directly.
 *
 * Idempotency is enforced upstream by the unique `webhook_events.event_id`
 * constraint — callers must record the event before writing state.
 *
 * The `as never` casts are required until `pnpm supabase:types` regenerates the
 * Database types to include this RPC + the new profiles columns (project
 * convention — see CLAUDE.md "Database stub forces `as never`").
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled'

export interface SetSubscriptionStateArgs {
  userId: string
  status: SubscriptionStatus
  periodEnd: string | null
  customerId: string | null
  subscriptionId: string | null
  resetUsage: boolean
}

export interface SetSubscriptionStateResult {
  ok: boolean
  error?: string
}

/** Maps a Stripe subscription status to our 3-value enum. */
export function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due'
    default:
      // canceled, incomplete_expired, paused, anything unknown
      return 'canceled'
  }
}

export async function setSubscriptionState(
  supabase: SupabaseClient,
  args: SetSubscriptionStateArgs
): Promise<SetSubscriptionStateResult> {
  const { error } = await supabase.rpc('set_subscription_state' as never, {
    p_user_id: args.userId,
    p_status: args.status,
    p_period_end: args.periodEnd,
    p_customer_id: args.customerId,
    p_subscription_id: args.subscriptionId,
    p_reset_usage: args.resetUsage,
  } as never)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
