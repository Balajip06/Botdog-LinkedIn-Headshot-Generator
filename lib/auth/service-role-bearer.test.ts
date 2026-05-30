import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyServiceRoleBearer } from './service-role-bearer'

/**
 * Red-team H1: constant-time bearer check for internal endpoints
 * (/api/push/dispatch, /api/analytics/referral). The compare must be:
 *   - false when env var is missing (fail closed)
 *   - false when header is null/empty
 *   - false when token differs (any length / any byte)
 *   - true only when header exactly equals `Bearer <SECRET>`
 *
 * We don't measure timing here — Node's `timingSafeEqual` is the
 * primitive; testing it would be testing the platform. We DO assert
 * length-mismatch is rejected before any compare so the implementation
 * doesn't accidentally crash on mismatched buffers.
 */
describe('verifyServiceRoleBearer', () => {
  const SECRET = 'srk-test-key-abcdef'

  beforeEach(() => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true for exact match', () => {
    expect(verifyServiceRoleBearer(`Bearer ${SECRET}`)).toBe(true)
  })

  it('returns false for null header', () => {
    expect(verifyServiceRoleBearer(null)).toBe(false)
  })

  it('returns false for empty header', () => {
    expect(verifyServiceRoleBearer('')).toBe(false)
  })

  it('returns false for missing "Bearer " prefix', () => {
    expect(verifyServiceRoleBearer(SECRET)).toBe(false)
  })

  it('returns false for wrong secret of same length', () => {
    expect(verifyServiceRoleBearer(`Bearer ${'x'.repeat(SECRET.length)}`)).toBe(false)
  })

  it('returns false for shorter token (length mismatch rejected before compare)', () => {
    expect(verifyServiceRoleBearer('Bearer short')).toBe(false)
  })

  it('returns false for longer token (length mismatch rejected before compare)', () => {
    expect(verifyServiceRoleBearer(`Bearer ${SECRET}extra`)).toBe(false)
  })

  it('fails closed when SUPABASE_SERVICE_ROLE_KEY is unset', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect(verifyServiceRoleBearer(`Bearer ${SECRET}`)).toBe(false)
  })

  it('case-sensitive Bearer prefix', () => {
    expect(verifyServiceRoleBearer(`bearer ${SECRET}`)).toBe(false)
    expect(verifyServiceRoleBearer(`BEARER ${SECRET}`)).toBe(false)
  })
})
