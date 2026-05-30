'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { createClient } from '@/lib/supabase/server'
import { verifyTurnstile } from '@/lib/turnstile/verify'

// `tos_accepted` MUST be the literal string "1" — the LoginForms checkbox
// emits "0" by default and "1" only once the user checks it. Refusing
// anything else closes the bypass route where a script POSTs without
// rendering the form.
const EmailSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
  turnstile_token: z.string().optional(),
  tos_accepted: z.literal('1'),
})

async function clientIp(): Promise<string | undefined> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
}

export async function signInWithEmail(formData: FormData): Promise<void> {
  const parsed = EmailSchema.safeParse({
    email: formData.get('email'),
    next: formData.get('next'),
    turnstile_token: formData.get('turnstile_token'),
    tos_accepted: formData.get('tos_accepted'),
  })
  if (!parsed.success) {
    // Distinguish ToS-not-checked from generic validation so the UI can show
    // the right copy.
    const tosFailed = parsed.error.issues.some((i) => i.path[0] === 'tos_accepted')
    redirect(tosFailed ? '/login?error=tos_required' : '/login?error=invalid_email')
  }

  const ok = await verifyTurnstile(parsed.data.turnstile_token ?? '', await clientIp())
  if (!ok) redirect('/login?error=bot_check_failed')

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  // Red-team H8: normalize `next` at the schema layer before it is
  // embedded into the magic-link `emailRedirectTo`. safeNextPath rejects
  // protocol-relative + backslash + userinfo escapes, falling back to
  // /me/creations. The callback re-runs safeNextPath on the post-exchange
  // redirect, so this is defence in depth — the goal here is to keep
  // hostile URLs out of the email body in the first place.
  const rawNext = parsed.data.next ?? '/me/studio'
  const normalizedNext = safeNextPath(rawNext)
  const next = normalizedNext === '/' ? '/me/studio' : normalizedNext
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error) redirect('/login?error=otp_send_failed')
  redirect('/login?sent=1')
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const rawNext = (formData.get('next') as string) || '/me/studio'
  const normalizedNext = safeNextPath(rawNext)
  const next = normalizedNext === '/' ? '/me/studio' : normalizedNext
  const token = (formData.get('turnstile_token') as string) || ''
  const tosAccepted = (formData.get('tos_accepted') as string) || '0'

  if (tosAccepted !== '1') redirect('/login?error=tos_required')

  const ok = await verifyTurnstile(token, await clientIp())
  if (!ok) redirect('/login?error=bot_check_failed')

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error || !data.url) redirect('/login?error=oauth_failed')
  redirect(data.url)
}
