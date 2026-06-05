'use client'

import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { GradientButton } from '@/components/brand/GradientButton'
import { BOTDOG_PLAN } from '@/lib/payments/subscription'

/**
 * "Botdog plan" upsell — a recurring $9/mo subscription (200 headshots a month,
 * no watermark, kept forever). Triggers the subscription checkout branch in
 * /api/stripe/checkout.
 */
export function BotdogPlanCard() {
  const [busy, setBusy] = useState(false)

  const onUpgrade = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: BOTDOG_PLAN.id }),
      })
      const json = (await res.json()) as { checkout_url?: string; error?: string }
      if (!res.ok || !json.checkout_url) throw new Error(json.error ?? `Checkout failed (${res.status})`)
      window.location.href = json.checkout_url
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed')
      setBusy(false)
    }
  }

  return (
    <div
      id="botdog-plan"
      className="border-border/60 bg-card scroll-mt-24 rounded-3xl border p-6"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary size-5" />
        <h2 className="text-xl">The Botdog plan</h2>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        $9/mo · 200 headshots a month · no watermark · kept forever · cancel anytime.
      </p>
      <GradientButton type="button" size="lg" className="mt-5 w-full" disabled={busy} onClick={onUpgrade}>
        {busy ? 'Opening…' : 'Get the Botdog plan'}
      </GradientButton>
    </div>
  )
}
