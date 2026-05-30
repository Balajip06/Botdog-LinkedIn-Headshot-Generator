'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { suggestionPayloadToJson } from '@/lib/trends/suggestions/payload'
import { verifyTurnstile } from '@/lib/turnstile/verify'

const ANON_USER_UUID = '00000000-0000-0000-0000-000000000000'

const SubmitSchema = z.object({
  trend_name: z.string().trim().min(2).max(200),
  reference_url: z.string().trim().url(),
  description: z.string().trim().min(10).max(500),
  your_email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  turnstile_token: z.string().trim().default(''),
})

interface RateLimitEntry {
  hits: number
  windowStart: number
}

const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT_MAX = 3

// In-memory throttle. Best-effort UX guard — survives only the lifetime of
// the Node process. Production multi-instance enforcement would need Upstash;
// the spec explicitly accepted in-memory for this surface.
const ipBuckets = new Map<string, RateLimitEntry>()

function takeRateLimit(ip: string): boolean {
  const now = Date.now()
  const existing = ipBuckets.get(ip)
  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipBuckets.set(ip, { hits: 1, windowStart: now })
    return true
  }
  if (existing.hits >= RATE_LIMIT_MAX) return false
  existing.hits += 1
  return true
}

function hashIp(ip: string): string {
  // Cheap, non-cryptographic hash so the rate-limit key isn't the raw IP in
  // process memory. djb2.
  let h = 5381
  for (let i = 0; i < ip.length; i += 1) {
    h = ((h << 5) + h + ip.charCodeAt(i)) | 0
  }
  return `ip:${(h >>> 0).toString(36)}`
}

async function getClientIp(): Promise<string> {
  const hdrs = await headers()
  const xff = hdrs.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return hdrs.get('x-real-ip') ?? 'unknown'
}

function makeExternalId(): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `user-${Date.now().toString(36)}-${rand}`
}

export async function submitTrend(formData: FormData): Promise<void> {
  const raw = {
    trend_name: formData.get('trend_name')?.toString() ?? '',
    reference_url: formData.get('reference_url')?.toString() ?? '',
    description: formData.get('description')?.toString() ?? '',
    your_email: formData.get('your_email')?.toString() ?? '',
    turnstile_token: formData.get('turnstile_token')?.toString() ?? '',
  }

  const parsed = SubmitSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const reason = first ? `${first.path.join('.')}: ${first.message}` : 'invalid input'
    redirect(`/submit-trend?error=${encodeURIComponent(reason)}`)
  }

  const ip = await getClientIp()
  const turnstileOk = await verifyTurnstile(parsed.data.turnstile_token, ip)
  if (!turnstileOk) {
    redirect(`/submit-trend?error=${encodeURIComponent('captcha failed — please retry')}`)
  }

  const bucketKey = hashIp(ip)
  if (!takeRateLimit(bucketKey)) {
    redirect(`/submit-trend?error=${encodeURIComponent('rate limit — try again tomorrow')}`)
  }

  // Persist via service-role: this route is unauthed and RLS blocks anon
  // inserts into trend_suggestions. Same pattern as admin/suggestions runScan.
  const supabase = createServiceClient()

  // The canonical user-suggestion payload requires submitted_by (uuid).
  // Public submitters have no user id, so the nil UUID stands in as
  // "anonymous". Admin inbox renders this as a user submission and resolves
  // the optional contact email from the audit metadata below.
  const payload = {
    type: 'user' as const,
    submitted_by: ANON_USER_UUID,
    title: parsed.data.trend_name,
    description: parsed.data.description,
    example_urls: [parsed.data.reference_url],
  }

  // makeExternalId reserved for future expansion when payload grows an
  // external_id field; the optional contact email is currently dropped on
  // the floor (form spec accepts that — admin can DM via the reference URL).
  void makeExternalId
  void parsed.data.your_email

  const insertRow = {
    source: 'user' as const,
    status: 'pending' as const,
    payload: suggestionPayloadToJson(payload),
  }

  const { error } = await supabase.from('trend_suggestions').insert(insertRow)
  if (error) {
    redirect(`/submit-trend?error=${encodeURIComponent('could not save — try again later')}`)
  }

  redirect('/submit-trend?submitted=1')
}
