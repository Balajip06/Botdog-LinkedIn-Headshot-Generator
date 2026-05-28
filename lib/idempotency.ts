/**
 * Idempotency-Key header parsing + generation.
 * Per amended plan §"Non-Negotiables 2": `/api/generate` accepts
 * `Idempotency-Key`; duplicate POST = 1 Gemini call, 1 row.
 *
 * Enforcement is at the DB level via UNIQUE (user_id, idempotency_key)
 * on `generations`. This module's job is to validate + normalize.
 */

const HEADER = 'idempotency-key'
const MIN_LEN = 16
const MAX_LEN = 128
const ALLOWED = /^[A-Za-z0-9_-]+$/

export function generateIdempotencyKey(): string {
  // crypto.randomUUID is 36 chars, well within bounds; strip dashes for terseness.
  return crypto.randomUUID().replaceAll('-', '')
}

export interface ParseResult {
  ok: boolean
  key?: string
  error?: string
}

export function parseIdempotencyKey(headers: Headers): ParseResult {
  const raw = headers.get(HEADER)
  if (!raw) return { ok: false, error: 'Idempotency-Key header missing' }
  const key = raw.trim()
  if (key.length < MIN_LEN || key.length > MAX_LEN) {
    return { ok: false, error: `Idempotency-Key must be ${MIN_LEN}-${MAX_LEN} chars` }
  }
  if (!ALLOWED.test(key)) {
    return { ok: false, error: 'Idempotency-Key must be [A-Za-z0-9_-]' }
  }
  return { ok: true, key }
}
