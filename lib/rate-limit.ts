import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type Limiter = {
  limit: (
    identifier: string
  ) => Promise<{ success: boolean; limit: number; remaining: number; reset: number }>
}

const passThroughLimiter: Limiter = {
  async limit() {
    return { success: true, limit: Infinity, remaining: Infinity, reset: 0 }
  },
}

let cachedRedis: Redis | null = null
let warnedNoRedis = false
function getRedis(): Redis | null {
  if (cachedRedis) return cachedRedis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // Fail loud in production: every limiter degrades to a no-op without Redis,
    // which silently removes the abuse guards on the public anon endpoints.
    if (!warnedNoRedis && process.env.NODE_ENV === 'production') {
      warnedNoRedis = true
      console.error('[rate-limit] Upstash Redis not configured — rate limiters are DISABLED')
    }
    return null
  }
  return (cachedRedis = new Redis({ url, token }))
}

function createLimiter(
  prefix: string,
  requests: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`
): Limiter {
  const redis = getRedis()
  if (!redis) return passThroughLimiter
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
    analytics: true,
  })
}

// 20 generations / hour / IP — per amended plan §"Non-Negotiables"
export const generationIpLimiter = createLimiter('rl:gen:ip', 20, '1 h')

// 5 anonymous attempts / day / fingerprint — extra guard beyond DB unique
export const anonymousFingerprintLimiter = createLimiter('rl:anon:fp', 5, '1 d')

// 10 anonymous photo uploads / hour / IP — the upload route is unauthenticated
// (logged-out visitors can't write to the RLS uploads bucket), so this bounds
// free-storage spam before the gated generate call runs.
export const anonymousUploadIpLimiter = createLimiter('rl:anon:upload:ip', 10, '1 h')

// 30 anon result reads / minute / IP — caps UUID enumeration + fetch amplification
// on the unauthenticated /anonymous/[id]/status + /download endpoints.
export const anonymousResultIpLimiter = createLimiter('rl:anon:result:ip', 30, '1 m')

// 5 GDPR exports / hour / user — bounds Storage signed-URL bursts + analytics
export const exportUserLimiter = createLimiter('rl:export:user', 5, '1 h')

// 60 trend-event POSTs / minute / IP — covers genuine browse traffic (one
// impression per card view + maybe one click) while killing the analytics
// inflation surface flagged in red-team M1. /api/track stays unauthenticated
// by design (we want pre-signup impressions) but unbounded writes let any
// attacker rewrite the "viral" leaderboard.
export const trackIpLimiter = createLimiter('rl:track:ip', 60, '1 m')
