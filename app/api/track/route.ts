import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { recordEvent } from '@/lib/analytics/event-store'
import { trackIpLimiter } from '@/lib/rate-limit'

const BodySchema = z.object({
  trend_slug: z.string().min(1),
  type: z.enum(['impression', 'click_generate']),
})

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Red-team M1: /api/track is intentionally unauthenticated (pre-signup
  // impressions are part of the funnel) but unbounded. Cap to 60/min/IP
  // so leaderboard inflation costs an attacker real proxy rotation.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = await trackIpLimiter.limit(`ip:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  let parsed
  try {
    parsed = BodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }
  await recordEvent(parsed.trend_slug, parsed.type)
  return NextResponse.json({ ok: true })
}
