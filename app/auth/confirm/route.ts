/**
 * Magic-link / token-hash verification endpoint.
 *
 * Production traffic source: Supabase Auth email template embeds this URL via
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/me/studio`.
 * Cross-device safe — no `code_verifier` cookie required because the token
 * hash is consumed by `verifyOtp()` server-side. This is the official
 * Supabase pattern for SSR magic-link sign-in.
 *
 * Dev traffic source: `pnpm dlx tsx scripts/generate-magic-link.ts` prints
 * a URL pointing here (replaces the previous `/auth/admin-verify` path).
 *
 * On success, the route runs the same new-user onboarding as `/auth/callback`
 * (TOS stamp, acquisition_source capture, referral cookie consumption,
 * SIGNUP_COMPLETED tracking) via the shared `runPostAuthOnboarding` helper.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { runPostAuthOnboarding } from '@/lib/auth/post-auth-onboarding'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { REFERRAL_COOKIE_NAME } from '@/lib/referrals/links'
import { createClient } from '@/lib/supabase/server'

type EmailOtpType = 'magiclink' | 'recovery' | 'invite' | 'email_change' | 'email'

const VALID_TYPES = new Set<EmailOtpType>([
  'magiclink',
  'recovery',
  'invite',
  'email_change',
  'email',
])

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const typeRaw = url.searchParams.get('type')
  const next = safeNextPath(url.searchParams.get('next'))

  if (!tokenHash || !typeRaw) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  if (!VALID_TYPES.has(typeRaw as EmailOtpType)) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: typeRaw as EmailOtpType,
  })

  if (error) {
    return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let consumedReferralCookie = false
  if (user) {
    const onboardingResult = await runPostAuthOnboarding({
      supabase,
      request,
      user,
      authMethod: 'magic_link',
      sentryCategory: 'auth.confirm',
    })
    consumedReferralCookie = onboardingResult.consumedReferralCookie
  }

  const response = NextResponse.redirect(new URL(next, request.url))
  if (consumedReferralCookie) {
    response.cookies.delete(REFERRAL_COOKIE_NAME)
  }
  return response
}
