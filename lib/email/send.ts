/**
 * Resend wrapper — transactional only.
 * Used as fallback when push subscription is missing/expired
 * and for magic-link delivery via Supabase auth's `email-otp` template.
 */

import * as Sentry from '@sentry/nextjs'
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

function reportFailure(reason: string, payload: EmailPayload, extra?: Record<string, unknown>): void {
  // Mask the recipient — keep the domain for debugging, drop the local part so
  // PII doesn't reach Sentry. e.g. "user@example.com" -> "***@example.com".
  const maskedTo = payload.to.replace(/^[^@]+/, '***')
  Sentry.captureMessage(`email send failed: ${reason}`, {
    level: 'warning',
    tags: { component: 'email', reason },
    extra: { subject: payload.subject, to: maskedTo, ...extra },
  })
}

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    reportFailure('from-missing', payload)
    return { ok: false, error: 'RESEND_FROM_EMAIL missing' }
  }

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
    if (error) {
      reportFailure('resend-error', payload, { resendMessage: error.message })
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown email error'
    reportFailure('throw', payload, { message })
    return { ok: false, error: message }
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
