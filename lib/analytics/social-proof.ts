/**
 * Social-proof counter for the home hero. Cheap aggregate read against
 * `generations`. Falls back to a deterministic baseline so the badge is
 * never empty even pre-launch.
 *
 * Cached at the home page's ISR window (10 min) so this is not a hot path.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface SocialProof {
  shippedToday: number
  shippedTotal: number
  isMock: boolean
}

const MOCK_PROOF: Omit<SocialProof, 'isMock'> = {
  shippedToday: 184,
  shippedTotal: 12_487,
}

export async function getSocialProof(supabase: SupabaseClient): Promise<SocialProof> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const [{ count: todayCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', startOfDay.toISOString()),
    supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
  ])

  const shippedToday = todayCount ?? 0
  const shippedTotal = totalCount ?? 0

  if (shippedTotal === 0) {
    return { ...MOCK_PROOF, isMock: true }
  }

  return { shippedToday, shippedTotal, isMock: false }
}
