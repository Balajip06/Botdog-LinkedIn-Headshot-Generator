import { describe, expect, it } from 'vitest'
import { generateIdempotencyKey, parseIdempotencyKey } from './idempotency'

describe('generateIdempotencyKey', () => {
  it('produces 32 lowercase hex chars (UUID with dashes stripped)', () => {
    const key = generateIdempotencyKey()
    expect(key).toMatch(/^[0-9a-f]{32}$/)
  })

  it('returns a different value each call', () => {
    expect(generateIdempotencyKey()).not.toBe(generateIdempotencyKey())
  })
})

function makeHeaders(value?: string) {
  const h = new Headers()
  if (value !== undefined) h.set('Idempotency-Key', value)
  return h
}

describe('parseIdempotencyKey', () => {
  it('accepts a well-formed key', () => {
    const k = generateIdempotencyKey()
    const r = parseIdempotencyKey(makeHeaders(k))
    expect(r.ok).toBe(true)
    expect(r.key).toBe(k)
  })

  it('rejects missing header', () => {
    expect(parseIdempotencyKey(makeHeaders())).toMatchObject({ ok: false })
  })

  it('rejects too-short key', () => {
    expect(parseIdempotencyKey(makeHeaders('short'))).toMatchObject({ ok: false })
  })

  it('rejects key with invalid chars', () => {
    expect(parseIdempotencyKey(makeHeaders('a'.repeat(20) + ' !!!'))).toMatchObject({ ok: false })
  })

  it('rejects key longer than 128 chars', () => {
    expect(parseIdempotencyKey(makeHeaders('a'.repeat(129)))).toMatchObject({ ok: false })
  })

  it('trims surrounding whitespace', () => {
    const k = generateIdempotencyKey()
    expect(parseIdempotencyKey(makeHeaders(`  ${k}  `)).key).toBe(k)
  })
})
