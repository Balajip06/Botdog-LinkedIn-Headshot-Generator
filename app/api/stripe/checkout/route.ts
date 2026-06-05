import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { EVENTS, flushServer, trackServer } from '@/lib/analytics/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { findPack, isPackId, requirePackPriceId } from '@/lib/payments/packs'
import { BOTDOG_PLAN, isSubscriptionPlanId, requireSubPriceId } from '@/lib/payments/subscription'

export const runtime = 'nodejs'

// Accepts either a one-time credit pack (`pack_id`) or the recurring
// "Botdog plan" subscription (`plan`). Exactly one must be present.
const BodySchema = z
  .object({
    pack_id: z.string().optional(),
    plan: z.string().optional(),
  })
  .refine((b) => Boolean(b.pack_id) !== Boolean(b.plan), 'provide exactly one of pack_id or plan')

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  return new Stripe(key)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await request.json())
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'invalid body' },
      { status: 400 }
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Subscription branch — the recurring "Botdog plan". Reuses the customer's
  // stored Stripe customer id when present so renewals + portal stay on one
  // customer; `subscription_data.metadata.user_id` lets customer.subscription.*
  // webhook events map back to our user without a customer-id lookup.
  if (body.plan) {
    if (!isSubscriptionPlanId(body.plan)) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    }
    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle<{ stripe_customer_id: string | null }>()

    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: requireSubPriceId(), quantity: 1 }],
        success_url: `${siteUrl}/me/creations?sub=success`,
        cancel_url: `${siteUrl}/me/settings?sub=cancelled`,
        client_reference_id: user.id,
        ...(profile?.stripe_customer_id
          ? { customer: profile.stripe_customer_id }
          : { customer_email: user.email ?? undefined }),
        metadata: { user_id: user.id, kind: 'subscription' },
        subscription_data: { metadata: { user_id: user.id } },
      })
      if (!session.url) {
        return NextResponse.json({ error: 'Stripe returned no checkout url' }, { status: 502 })
      }
      trackServer(user.id, EVENTS.CHECKOUT_STARTED, {
        credit_pack: 'botdog_plan',
        price_usd: BOTDOG_PLAN.priceCents / 100,
      })
      await flushServer()
      return NextResponse.json({ checkout_url: session.url, session_id: session.id })
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'stripe error' },
        { status: 500 }
      )
    }
  }

  if (!isPackId(body.pack_id)) {
    return NextResponse.json({ error: 'unknown pack_id' }, { status: 400 })
  }
  const pack = findPack(body.pack_id)
  if (!pack) return NextResponse.json({ error: 'Unknown pack' }, { status: 400 })

  // First-purchase 20%-off coupon. Claim atomically via a service-role
  // UPDATE that sets `first_purchase_discount_used_at = now()` only if it
  // is currently NULL. Postgres serializes the row update, so two
  // concurrent checkout requests (browser double-click, retry) cannot
  // both claim the slot — only the first UPDATE returns a row; the second
  // sees zero rows and falls through to a full-price session.
  //
  // Rollback: if Stripe `sessions.create` later throws, we clear the
  // stamp so the user keeps eligibility. If the process crashes between
  // the claim and Stripe success, the coupon is forfeit — accepted
  // trade-off vs. the alternative of stamping in the webhook (which
  // allowed unbounded discounted sessions in flight before any webhook
  // arrived, per red-team M4).
  const firstPurchaseCouponId = process.env.STRIPE_FIRST_PURCHASE_COUPON_ID
  let applyFirstPurchaseCoupon = false
  if (firstPurchaseCouponId) {
    const service = createServiceClient()
    const claimedAt = new Date().toISOString()
    const { data: claimed } = await service
      .from('profiles')
      .update({ first_purchase_discount_used_at: claimedAt })
      .eq('id', user.id)
      .is('first_purchase_discount_used_at', null)
      .select('id')
      .maybeSingle()
    if (claimed) applyFirstPurchaseCoupon = true
  }

  let session: Stripe.Checkout.Session
  try {
    const stripe = getStripe()
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: requirePackPriceId(pack), quantity: 1 }],
      success_url: `${siteUrl}/me/creations?purchase=success&pack=${pack.id}`,
      cancel_url: `${siteUrl}/me/settings?purchase=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      ...(applyFirstPurchaseCoupon && firstPurchaseCouponId
        ? { discounts: [{ coupon: firstPurchaseCouponId }] }
        : {}),
      // Webhook handler uses metadata to grant credits idempotently
      // by joining to webhook_events.event_id; pack_id stays portable
      // across test/staging/prod (price_id changes per env).
      metadata: {
        user_id: user.id,
        pack_id: pack.id,
        credits: String(pack.credits),
      },
    })
  } catch (err: unknown) {
    if (applyFirstPurchaseCoupon) {
      const service = createServiceClient()
      await service
        .from('profiles')
        .update({ first_purchase_discount_used_at: null })
        .eq('id', user.id)
    }
    const message = err instanceof Error ? err.message : 'stripe error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (!session.url) {
    if (applyFirstPurchaseCoupon) {
      const service = createServiceClient()
      await service
        .from('profiles')
        .update({ first_purchase_discount_used_at: null })
        .eq('id', user.id)
    }
    return NextResponse.json({ error: 'Stripe returned no checkout url' }, { status: 502 })
  }

  trackServer(user.id, EVENTS.CHECKOUT_STARTED, {
    credit_pack: pack.id === 'small' ? '50' : pack.id === 'medium' ? '200' : '600',
    price_usd: pack.priceCents / 100,
  })
  await flushServer()

  return NextResponse.json({ checkout_url: session.url, session_id: session.id })
}
