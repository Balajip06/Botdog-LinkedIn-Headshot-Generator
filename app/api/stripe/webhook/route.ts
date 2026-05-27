import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  return new Stripe(key)
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

  // Idempotent insert into webhook_events; unique (source, event_id) blocks dupes.
  // Cast required until `pnpm supabase:types` regenerates strict Database types.
  const webhookRow = {
    source: 'stripe',
    event_id: event.id,
    payload: event as unknown as Record<string, unknown>,
  } as never

  const { error: insertError } = await supabase.from('webhook_events').insert(webhookRow)

  // Postgres unique violation = '23505'. Already processed = idempotent success.
  if (insertError && !insertError.message.includes('duplicate key')) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // TODO Phase 5: dispatch on event.type — checkout.session.completed → grant credits.
  // For Phase 1 stub, recording + dedup is enough.

  return NextResponse.json({ received: true })
}
