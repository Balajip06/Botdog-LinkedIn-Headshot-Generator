/**
 * Restricts an attacker-controlled `next` query value to a same-origin path.
 *
 * Without this guard, `new URL(next, request.url)` happily resolves
 * `//evil.com/path`, `https://evil.com`, `/\evil.com`, or `/@evil.com` to
 * off-site URLs — turning the OAuth callback into an open redirect (phishing
 * pivot that steals a freshly-issued session).
 *
 * Returns `/` when the input is unsafe.
 */
export function safeNextPath(raw: string | null): string {
  if (!raw) return '/'
  // Must start with a single slash and not contain a protocol-relative prefix.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  // Reject backslashes (some browsers treat as `/`) and `@` (userinfo escape).
  if (raw.includes('\\') || raw.includes('@')) return '/'
  return raw
}
