'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * Opens the Stripe Billing Portal so an active subscriber can update payment or
 * cancel. POSTs to /api/stripe/portal (which resolves the stored customer id).
 */
export function ManageSubscriptionButton() {
  const [busy, setBusy] = useState(false)

  const onManage = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? `Portal failed (${res.status})`)
      window.location.href = json.url
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not open billing portal')
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className="rounded-full"
      disabled={busy}
      onClick={onManage}
    >
      {busy ? 'Opening…' : 'Manage subscription'}
    </Button>
  )
}
