'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyTurnstile } from '@/lib/turnstile/verify'

const EmailSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
  turnstile_token: z.string().optional(),
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
  })
  if (!parsed.success) redirect('/login?error=invalid_email')

  const ok = await verifyTurnstile(parsed.data.turnstile_token ?? '', await clientIp())
  if (!ok) redirect('/login?error=bot_check_failed')

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const next = parsed.data.next ?? '/'
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error) redirect('/login?error=otp_send_failed')
  redirect('/login?sent=1')
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = (formData.get('next') as string) || '/'
  const token = (formData.get('turnstile_token') as string) || ''

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
