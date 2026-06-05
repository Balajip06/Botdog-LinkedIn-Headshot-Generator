/**
 * Client-side anonymous-trial fingerprint.
 *
 * The anon generate route (`/api/generate-anonymous`) dedupes by a SHA-256 hash
 * of the FingerprintJS visitor id — we hash on the client so the raw fingerprint
 * never reaches the server. Browser-only (uses crypto.subtle + FingerprintJS).
 */

let cached: Promise<string> | null = null

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Resolve (and memoize) the hashed device fingerprint for this page load. */
export function getFingerprintHash(): Promise<string> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('getFingerprintHash is browser-only'))
  }
  if (cached) return cached
  cached = (async () => {
    const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default
    const agent = await FingerprintJS.load()
    const result = await agent.get()
    return sha256Hex(result.visitorId)
  })()
  return cached
}
