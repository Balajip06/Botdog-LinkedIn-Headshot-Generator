/**
 * Resend wrapper — transactional only.
 * Used as fallback when push subscription is missing/expired
 * and for magic-link delivery via Supabase auth's `email-otp` template.
 */

import { Resend } from 'resend'

let cached: Resend | null = null
function getResend(): Resend {
  if (cached) return cached
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY missing')
  cached = new Resend(key)
  return cached
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailSendResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) return { ok: false, error: 'RESEND_FROM_EMAIL missing' }

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown email error' }
  }
}

/** Result-ready email when push subscription unavailable. */
export function buildResultReadyEmail(args: { trendTitle: string; resultUrl: string }): {
  subject: string
  html: string
  text: string
} {
  return {
    subject: `Your ${args.trendTitle} image is ready`,
    text: `Your image is ready: ${args.resultUrl}`,
    html: `<p>Your <strong>${escapeHtml(args.trendTitle)}</strong> image is ready.</p><p><a href="${args.resultUrl}">View it</a></p>`,
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return c
    }
  })
}
