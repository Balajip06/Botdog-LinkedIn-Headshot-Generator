import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import Stripe from 'stripe'
import { EVENTS, flushServer, trackServer } from '@/lib/analytics/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { grantCredits } from '@/lib/payments/credits'
import { findPack, isPackId } from '@/lib/payments/packs'
import { mapStripeStatus, setSubscriptionState } from '@/lib/payments/subscription-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  return new Stripe(key)
}

/**
 * Narrow a Stripe.Event to the generated `Json` type for storage in the
 * `webhook_events.payload` JSONB column. Stripe events are wire-format JSON
 * coming off the SDK's `constructEvent` parser — every field is already a
 * primitive, plain object, or array. The cast is required only because the
 * SDK's recursive TypeScript type doesn't structurally match our `Json`
 * helper; the runtime payload is provably Json-compatible.
 */
function stripeEventToJson(event: Stripe.Event): Json {
  return event as unknown as Json
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Idempotency gate: insert into webhook_events; UNIQUE (source, event_id) blocks duplicates.
  const webhookRow = {
    source: 'stripe',
    event_id: event.id,
    payload: stripeEventToJson(event),
  }

  const { error: insertError } = await supabase.from('webhook_events').insert(webhookRow)

  if (insertError) {
    // 23505 = duplicate key = already processed; return 200 idempotently.
    if (insertError.message.includes('duplicate key')) {
      return NextResponse.json({ received: true, duplicate: true })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Dispatch
  try {
    await handleEvent(event, supabase)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'handler error'
    // Mark processed_at NULL stays so a retry can re-run; but unique constraint
    // means Stripe must resend with a new event_id. Log + 500 so Stripe retries.
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Mark processed. Red-team H6: a silent failure here leaves the row
  // looking unprocessed even though credits were granted, which corrupts
  // the `webhook_events_unprocessed_idx` monitoring partial index and
  // makes oncall reconciliation queries wrong. Surface to Sentry instead
  // of swallowing — but still return 200 so Stripe does not retry (the
  // grant already happened; a retry would no-op via the duplicate-key
  // path on insert anyway).
  const processedUpdate = { processed_at: new Date().toISOString() }
  const { error: processedError } = await supabase
    .from('webhook_events')
    .update(processedUpdate)
    .eq('source', 'stripe')
    .eq('event_id', event.id)

  if (processedError) {
    Sentry.captureException(
      new Error(`webhook_events processed_at stamp failed: ${processedError.message}`),
      { extra: { event_id: event.id, event_type: event.type } }
    )
  }

  return NextResponse.json({ received: true })
}

async function handleEvent(
  event: Stripe.Event,
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
        event.id,
        supabase
      )
      return
    case 'invoice.paid':
      // Renewal — refresh the monthly allowance counter (reset_usage). This is
      // the no-stacking refresh; unused generations do not roll over.
      await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase)
      return
    case 'customer.subscription.updated':
      // Status / period sync (past_due, cancel-at-period-end). Usage NOT reset.
      await handleSubscriptionChange(event.data.object as Stripe.Subscription, false, supabase)
      return
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription, false, supabase)
      return
    // Other event types (charge.refunded, etc.) wired post-MVP.
    default:
      // No-op for unhandled types; row still recorded in webhook_events for auditing.
      return
  }
}

/** customer can be a string id or an expanded object; we only need the id. */
function customerId(customer: string | { id: string } | null): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

/** Unix-seconds → ISO, or null. */
function unixToIso(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null
}

/**
 * Stripe v22 moved `current_period_end` off the Subscription top-level onto each
 * subscription item. For a single-price plan all items share the period, so the
 * first item is authoritative.
 */
function subPeriodEndIso(sub: Stripe.Subscription): string | null {
  return unixToIso(sub.items.data[0]?.current_period_end)
}

async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  eventId: string,
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  const userId = session.metadata?.user_id ?? session.client_reference_id ?? null
  if (!userId) {
    throw new Error(`subscription checkout missing user_id (event ${eventId}, session ${session.id})`)
  }

  // Retrieve the subscription to read its current period end + true status.
  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  let periodEnd: string | null = null
  let status = 'active'
  if (subId) {
    const sub = await getStripe().subscriptions.retrieve(subId)
    periodEnd = subPeriodEndIso(sub)
    status = sub.status
  }

  const result = await setSubscriptionState(supabase, {
    userId,
    status: mapStripeStatus(status),
    periodEnd,
    customerId: customerId(session.customer),
    subscriptionId: subId ?? null,
    resetUsage: true,
  })
  if (!result.ok) throw new Error(`set_subscription_state failed: ${result.error}`)

  trackServer(userId, EVENTS.CHECKOUT_COMPLETED, { credit_pack: 'botdog_plan', price_usd: 9 })
  await flushServer()
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  // v22: the subscription reference lives on invoice.parent.subscription_details.
  const ref = invoice.parent?.subscription_details?.subscription
  const subId = typeof ref === 'string' ? ref : ref?.id
  if (!subId) return // not a subscription invoice — ignore
  const sub = await getStripe().subscriptions.retrieve(subId)
  const userId = sub.metadata?.user_id ?? null
  if (!userId) return // unmapped subscription — nothing to refresh

  const result = await setSubscriptionState(supabase, {
    userId,
    status: mapStripeStatus(sub.status),
    periodEnd: subPeriodEndIso(sub),
    customerId: customerId(sub.customer),
    subscriptionId: subId,
    resetUsage: true,
  })
  if (!result.ok) throw new Error(`set_subscription_state (invoice.paid) failed: ${result.error}`)
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription,
  resetUsage: boolean,
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  const userId = sub.metadata?.user_id ?? null
  if (!userId) return // unmapped — ignore

  const result = await setSubscriptionState(supabase, {
    userId,
    status: mapStripeStatus(sub.status),
    periodEnd: subPeriodEndIso(sub),
    customerId: customerId(sub.customer),
    subscriptionId: sub.id,
    resetUsage,
  })
  if (!result.ok) throw new Error(`set_subscription_state (subscription change) failed: ${result.error}`)
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
  supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
  // Subscription checkouts (the "Botdog plan") set subscription state instead
  // of granting one-time credits.
  if (session.mode === 'subscription' || session.metadata?.kind === 'subscription') {
    await handleSubscriptionCheckout(session, eventId, supabase)
    return
  }

  const userId = session.metadata?.user_id ?? session.client_reference_id ?? null
  const packId = session.metadata?.pack_id ?? null

  if (!userId || !packId || !isPackId(packId)) {
    throw new Error(
      `checkout.session.completed missing user_id or pack_id (event ${eventId}, session ${session.id})`
    )
  }

  const pack = findPack(packId)
  if (!pack) {
    throw new Error(`checkout.session.completed unknown pack ${packId} (event ${eventId})`)
  }

  const result = await grantCredits(supabase, {
    userId,
    amount: pack.credits,
    source: 'stripe',
    sourceRef: eventId,
  })

  if (!result.ok) {
    throw new Error(`grant_credits failed: ${result.error}`)
  }

  trackServer(userId, EVENTS.CHECKOUT_COMPLETED, {
    credit_pack: pack.id === 'small' ? '50' : pack.id === 'medium' ? '200' : '600',
    price_usd: pack.priceCents / 100,
  })
  await flushServer()
}
