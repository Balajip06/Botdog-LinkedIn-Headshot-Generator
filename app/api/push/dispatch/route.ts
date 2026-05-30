import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyServiceRoleBearer } from '@/lib/auth/service-role-bearer'
import { sendPush } from '@/lib/push/send'
import { buildResultReadyEmail, sendEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

const BodySchema = z.object({
  generation_id: z.string().uuid(),
})

// Runtime validation of the push_subscription JSONB column. The DB type
// is `Json | null`, not the nested object shape we need at use-site
// (`subscription.keys.p256dh`). Red-team H9: a JSONB row that drifted
// from the expected shape (renamed key, partial write) would have
// dereferenced `undefined` and crashed mid-request without surfacing
// the shape mismatch. Zod parse turns the drift into an explicit
// "skip push, fall through to email" path.
const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

type PushSubscriptionShape = z.infer<typeof PushSubscriptionSchema>

export async function POST(request: NextRequest) {
  if (!verifyServiceRoleBearer(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await request.json())
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'invalid body' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  const { data: genData } = await supabase
    .from('generations')
    .select('id, user_id, status, output_image_url, trend_id')
    .eq('id', body.generation_id)
    .maybeSingle()
  const gen = genData
  if (!gen) return NextResponse.json({ error: 'generation not found' }, { status: 404 })
  if (gen.status !== 'completed') {
    return NextResponse.json({ skipped: true, reason: 'not completed' })
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('email, push_subscription')
    .eq('id', gen.user_id)
    .maybeSingle()
  const profileEmail: string | null = profileData?.email ?? null
  let pushSubscription: PushSubscriptionShape | null = null
  if (profileData?.push_subscription) {
    const parsed = PushSubscriptionSchema.safeParse(profileData.push_subscription)
    if (parsed.success) {
      pushSubscription = parsed.data
    } else {
      // Stored shape is wrong (schema drift or partial write). Clear so
      // future runs go straight to email and surface the drift to
      // monitoring via the cleared-row count.
      await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('id', gen.user_id)
    }
  }

  const { data: trendData } = await supabase
    .from('trends')
    .select('slug, title')
    .eq('id', gen.trend_id)
    .maybeSingle()
  const trend = trendData ?? { slug: 'unknown', title: 'Trend' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const resultUrl = `${siteUrl}/result/${gen.id}`

  if (pushSubscription) {
    const result = await sendPush(pushSubscription, {
      title: `Your ${trend.title} is ready`,
      body: 'Tap to view + download.',
      url: resultUrl,
      tag: `gen-${gen.id}`,
    })

    if (result.expired) {
      // 404/410 → clear stale subscription so future runs fall through to email.
      const clear = { push_subscription: null }
      await supabase.from('profiles').update(clear).eq('id', gen.user_id)
    } else if (result.ok) {
      return NextResponse.json({ delivered: 'push' })
    }
  }

  // Email fallback (push absent OR push send failed terminally).
  if (profileEmail) {
    const tpl = buildResultReadyEmail({ trendTitle: trend.title, resultUrl })
    const sent = await sendEmail({
      to: profileEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    })
    if (sent.ok) return NextResponse.json({ delivered: 'email' })
    return NextResponse.json({ delivered: 'none', error: sent.error })
  }

  return NextResponse.json({ delivered: 'none', reason: 'no contact channel' })
}
