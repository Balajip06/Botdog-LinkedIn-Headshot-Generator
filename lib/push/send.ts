/**
 * Web Push (VAPID) wrapper.
 * Used by Edge Function when generation completes — falls back to Resend email
 * if subscription is null or send fails terminally.
 */

import webpush, { type PushSubscription, type SendResult } from 'web-push'

let configured = false

function ensureConfigured(): void {
  if (configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:noreply@example.com'
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  /** URL to open on click; typically `/result/<id>`. */
  url: string
  /** Visual badge or icon. */
  icon?: string
  tag?: string
}

export interface PushSendResult {
  ok: boolean
  status?: number
  expired?: boolean
  error?: string
}

export async function sendPush(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<PushSendResult> {
  try {
    ensureConfigured()
    const result: SendResult = await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { ok: true, status: result.statusCode }
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string }
    const expired = e.statusCode === 404 || e.statusCode === 410
    return {
      ok: false,
      status: e.statusCode,
      expired,
      error: e.message ?? 'unknown push error',
    }
  }
}
