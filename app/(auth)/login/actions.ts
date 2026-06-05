'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { createClient } from '@/lib/supabase/server'
import { verifyTurnstile } from '@/lib/turnstile/verify'

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
