/**
 * Cloudflare Turnstile siteverify wrapper.
 *
 * Server-side only. Returns true when TURNSTILE_SECRET_KEY is missing
 * (dev/preview/test) so the auth + anonymous flows don't break locally
 * before keys are provisioned.
 */

const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // dev/test: no-op
  if (!token) return false

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    })
    if (!res.ok) return false
    const json = (await res.json()) as { success?: boolean }
    return json.success === true
  } catch {
    return false
  }
}
