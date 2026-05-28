/**
 * Credit-grant helpers. Wraps the SECURITY DEFINER `grant_credits` SQL
 * function so callers do not poke `profiles.credits_balance` directly.
 *
 * Idempotency is enforced *upstream* by the unique `webhook_events.event_id`
 * constraint — this function does not de-dupe by itself. Callers must ensure
 * the event is recorded before granting.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type GrantSource = 'stripe' | 'manual' | 'referral' | 'support'

export interface GrantArgs {
  userId: string
  amount: number
  source: GrantSource
  sourceRef: string
}

export interface GrantResult {
  ok: boolean
  error?: string
}

export async function grantCredits(
  supabase: SupabaseClient,
  args: GrantArgs
): Promise<GrantResult> {
  if (args.amount <= 0) {
    return { ok: false, error: 'amount must be positive' }
  }

  const { error } = await supabase.rpc('grant_credits', {
    p_user_id: args.userId,
    p_amount: args.amount,
    p_source: args.source,
    p_source_ref: args.sourceRef,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
