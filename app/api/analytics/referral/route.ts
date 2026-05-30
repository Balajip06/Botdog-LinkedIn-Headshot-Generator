import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { EVENTS, flushServer, trackServer } from '@/lib/analytics/server'
import { verifyServiceRoleBearer } from '@/lib/auth/service-role-bearer'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * REFERRAL_REDEEMED bridge.
 *
 * Configured in Supabase Dashboard → Database → Webhooks:
 *   Table:        public.referrals
 *   Events:       UPDATE
 *   Method:       POST
 *   URL:          ${SITE_URL}/api/analytics/referral
 *   Headers:      Authorization: Bearer <service-role-key>
 *                 content-type: application/json
 *
 * The `maybe_reward_referral` trigger in migration 0004 flips
 * referrals.status from 'pending' to 'rewarded' after the referee's
 * first completed generation. This route filters for that transition
 * (old.status !== 'rewarded' && new.status === 'rewarded') and fires
 * REFERRAL_REDEEMED keyed by the referrer's distinctId, with a
 * SHA-256 hash of the referrer id and the running bonus_credits_earned
 * total so PostHog can spot farming patterns (capped at 50 per the
 * profiles constraint in migration 0001).
 */

const BONUS_PER_REFERRAL = 10 // mirrors the trigger in migration 0004

const PayloadSchema = z.object({
  type: z.literal('UPDATE'),
  table: z.literal('referrals'),
  record: z.object({
    referrer_id: z.string().uuid(),
    referred_id: z.string().uuid(),
    status: z.literal('rewarded'),
  }),
  old_record: z
    .object({
      status: z.string().optional(),
    })
    .optional(),
})

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(request: NextRequest) {
  if (!verifyServiceRoleBearer(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: z.infer<typeof PayloadSchema>
  try {
    payload = PayloadSchema.parse(await request.json())
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'invalid body' },
      { status: 400 }
    )
  }

  // Only fire on the pending→rewarded transition. Webhook may also fire
  // for unrelated UPDATEs (e.g. backfills) so guard explicitly.
  if (payload.old_record?.status === 'rewarded') {
    return NextResponse.json({ skipped: true, reason: 'not first transition' })
  }

  const supabase = createServiceClient()
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('bonus_credits_earned')
    .eq('id', payload.record.referrer_id)
    .maybeSingle()
  const totalBonus = (profileRow ?? { bonus_credits_earned: 0 }).bonus_credits_earned

  const referrerHash = await sha256Hex(payload.record.referrer_id)
  trackServer(payload.record.referrer_id, EVENTS.REFERRAL_REDEEMED, {
    referrer_id_hash: referrerHash,
    bonus_credits: BONUS_PER_REFERRAL,
    total_bonus_earned: totalBonus,
  })
  await flushServer()

  return NextResponse.json({ ok: true })
}
