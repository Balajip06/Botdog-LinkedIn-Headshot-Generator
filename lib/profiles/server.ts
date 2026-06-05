import { createClient } from '@/lib/supabase/server'

export interface CurrentProfile {
  id: string
  email: string
  credits_balance: number
  free_used_this_week: number
  referral_code: string
  bonus_credits_earned: number
}

/**
 * Load the signed-in user's profile (quota + referral fields). Returns null when
 * logged out. Shared by /me/settings and the account page so the quota/referral
 * read never drifts between surfaces.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, email, credits_balance, free_used_this_week, referral_code, bonus_credits_earned')
    .eq('id', user.id)
    .maybeSingle()

  return data ?? null
}
