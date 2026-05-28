import {
  parseReferralFromUrl,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
} from '@/lib/referrals/links'
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

// Next 16 renamed "middleware" -> "proxy". File + exported function name both changed.
export async function proxy(request: NextRequest) {
  const response = await updateSession(request)

  // Capture ?ref=<12-hex> into a long-lived cookie so signup (in /auth/callback)
  // can attribute the referrer. First touch wins — never overwrite an existing
  // cookie, which keeps the original referrer credited even if the visitor
  // later clicks a different ref link.
  const refCode = parseReferralFromUrl(request.url)
  if (refCode && !request.cookies.get(REFERRAL_COOKIE_NAME)) {
    response.cookies.set({
      name: REFERRAL_COOKIE_NAME,
      value: refCode,
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico, images, public assets
     * - api/stripe/webhook (handles its own raw body + idempotency)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
}
