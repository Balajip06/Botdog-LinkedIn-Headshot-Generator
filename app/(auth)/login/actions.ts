'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verifyTurnstile } from '@/lib/turnstile/verify'

/** Extract a ?anon=<uuid> attempt id from a resolved next path, if present. */
function attemptIdFromNext(next: string): string | null {
  const query = next.split('?')[1]
  if (!query) return null
  const id = new URLSearchParams(query).get('anon')
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null
}

/**
 * Best-effort email-lead capture. Records every email submission so the
 * acquisition funnel can count "clients who entered email" — including those
 * who never click the magic link. Upsert on lower(email) keeps it one row per
 * lead (first-seen created_at preserved). NEVER throws: a failure here must not
 * block the magic-link send. Service-role write (email_leads is RLS deny-all).
 */
async function captureEmailLead(
  email: string,
  next: string,
  source: 'inline' | 'login'
): Promise<void> {
  try {
    const service = createServiceClient()
    await service.from('email_leads').upsert(
      { email, source, attempt_id: attemptIdFromNext(next), next_path: next } as never,
      { onConflict: 'email', ignoreDuplicates: true }
    )
  } catch (err) {
    Sentry.captureException(err, { tags: { component: 'email_leads', op: 'capture' } })
  }
}

// `tos_accepted` MUST be the literal string "1" — the LoginForms checkbox
// emits "0" by default and "1" only once the user checks it.
const MagicLinkSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
  turnstile_token: z.string().optional(),
  tos_accepted: z.literal('1'),
})

async function clientIp(): Promise<string | undefined> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
}

function resolveNext(raw: string | undefined): string {
  const normalized = safeNextPath(raw ?? '/me/creations')
  return normalized === '/' ? '/me/creations' : normalized
}

export async function signInWithMagicLink(formData: FormData): Promise<void> {
  const parsed = MagicLinkSchema.safeParse({
    email: formData.get('email'),
    next: formData.get('next'),
    turnstile_token: formData.get('turnstile_token'),
    tos_accepted: formData.get('tos_accepted'),
  })
  if (!parsed.success) {
    const tosFailed = parsed.error.issues.some((i) => i.path[0] === 'tos_accepted')
    if (tosFailed) redirect('/login?error=tos_required')
    redirect('/login?error=invalid_email')
  }

  const ok = await verifyTurnstile(parsed.data.turnstile_token ?? '', await clientIp())
  if (!ok) redirect('/login?error=bot_check_failed')

  const next = resolveNext(parsed.data.next)
  await captureEmailLead(parsed.data.email, next, 'login')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const supabase = await createClient()

  // Passwordless magic link. `shouldCreateUser` signs up new emails on first
  // click. The email's link lands on /auth/callback (same browser, PKCE) or
  // /auth/confirm (cross-device, token_hash) — both already wired.
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) redirect('/login?error=magic_link_failed')
  redirect('/login?sent=1')
}

const InlineMagicLinkSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
  turnstileToken: z.string().optional(),
  tosAccepted: z.boolean(),
})

export interface InlineMagicLinkResult {
  ok: boolean
  error?: 'invalid_email' | 'tos_required' | 'bot_check_failed' | 'magic_link_failed'
}

/**
 * No-redirect variant of signInWithMagicLink for the in-card email step. Returns
 * a result so the homepage generator can stay on its inline "check your inbox"
 * state instead of navigating to /login. Keeps the SAME server-side guards as
 * the login form (Turnstile + ToS) so the inline path is not a bot bypass.
 */
export async function requestMagicLinkInline(input: {
  email: string
  next?: string
  turnstileToken?: string
  tosAccepted: boolean
}): Promise<InlineMagicLinkResult> {
  const parsed = InlineMagicLinkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid_email' }
  if (!parsed.data.tosAccepted) return { ok: false, error: 'tos_required' }

  const ok = await verifyTurnstile(parsed.data.turnstileToken ?? '', await clientIp())
  if (!ok) return { ok: false, error: 'bot_check_failed' }

  const next = resolveNext(parsed.data.next)
  await captureEmailLead(parsed.data.email, next, 'inline')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) return { ok: false, error: 'magic_link_failed' }
  return { ok: true }
}
