import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time check for the `Authorization: Bearer <service-role-key>`
 * header on internal endpoints (push dispatch, analytics referral webhook).
 *
 * Red-team H1: a plain `auth !== expected` compare leaks per-byte timing
 * deltas and over enough samples lets an attacker recover the service-role
 * key byte-by-byte. `timingSafeEqual` requires equal-length buffers and
 * compares in fixed time. Length mismatch is rejected before the compare
 * to avoid the buffer-creation throw.
 */
export function verifyServiceRoleBearer(authHeader: string | null): boolean {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return false
  if (!authHeader) return false
  const expected = `Bearer ${secret}`
  const provided = Buffer.from(authHeader)
  const expectedBuf = Buffer.from(expected)
  if (provided.length !== expectedBuf.length) return false
  return timingSafeEqual(provided, expectedBuf)
}
