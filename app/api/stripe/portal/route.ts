import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  return new Stripe(key)
}

/**
 * Opens the Stripe Billing Portal so a subscriber can update payment method or
 * cancel. Requires a stored `stripe_customer_id` (captured by the first
 * subscription webhook). Returns 400 until then.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription to manage' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrl}/me/settings`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'stripe error' },
      { status: 500 }
    )
  }
}
