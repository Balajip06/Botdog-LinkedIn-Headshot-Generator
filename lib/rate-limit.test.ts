import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Red-team H4: rate-limit module silently no-ops when Upstash creds are
 * missing. The fallback is intentional for dev/CI (asserted at boot in
 * lib/env.ts for production), but we test the SHAPE of the fallback
 * here so future refactors can't accidentally swap it for `success:
 * false` (which would hard-block all requests in dev).
 */
describe('rate-limit helper', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns passThroughLimiter when UPSTASH_REDIS_REST_URL is unset', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const mod = await import('./rate-limit')
    const result = await mod.generationIpLimiter.limit('ip:1.2.3.4')
    expect(result.success).toBe(true)
    expect(result.limit).toBe(Infinity)
    expect(result.remaining).toBe(Infinity)
  })

  it('passThroughLimiter accepts arbitrary identifiers', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const mod = await import('./rate-limit')
    const a = await mod.generationIpLimiter.limit('a')
    const b = await mod.anonymousFingerprintLimiter.limit('b')
    const c = await mod.exportUserLimiter.limit('c')
    const d = await mod.trackIpLimiter.limit('d')
    expect([a.success, b.success, c.success, d.success]).toEqual([true, true, true, true])
  })

  it('passThroughLimiter never rejects regardless of call rate', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const mod = await import('./rate-limit')
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) => mod.trackIpLimiter.limit(`ip:${i}`))
    )
    expect(results.every((r) => r.success)).toBe(true)
  })
})
