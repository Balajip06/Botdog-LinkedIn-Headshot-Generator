'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { grantCredits } from '@/lib/payments/credits'
import { createServiceClient } from '@/lib/supabase/server'

const RefundFormSchema = z.object({
  email: z.string().email(),
  amount: z.coerce.number().int().min(1).max(1000),
  reason: z.string().min(3).max(200),
})

interface ProfileLookupRow {
  id: string
  email: string
}

function back(params: URLSearchParams): never {
  redirect(`/admin/refunds?${params.toString()}`)
}

export async function issueRefund(formData: FormData): Promise<void> {
  const parsed = RefundFormSchema.safeParse({
    email: formData.get('email'),
    amount: formData.get('amount'),
    reason: formData.get('reason'),
  })

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'invalid input'
    back(new URLSearchParams({ error: msg }))
  }

  const service = createServiceClient()

  const { data: profileRow, error: lookupErr } = await service
    .from('profiles')
    .select('id, email')
    .eq('email', parsed.data.email)
    .maybeSingle()

  if (lookupErr) {
    back(new URLSearchParams({ error: `lookup failed: ${lookupErr.message}` }))
  }
  const profile = (profileRow as unknown as ProfileLookupRow | null) ?? null
  if (!profile) {
    back(new URLSearchParams({ error: `no profile for ${parsed.data.email}` }))
  }

  // Slug the reason for the audit-log source_ref so it stays grep-able. Keep
  // the human reason out of source_ref since it'll be queried + indexed.
  const ref = `manual-${Date.now()}-${parsed.data.reason.slice(0, 40).replace(/[^a-z0-9-]/gi, '-')}`
  const result = await grantCredits(service, {
    userId: profile.id,
    amount: parsed.data.amount,
    source: 'support',
    sourceRef: ref,
  })

  if (!result.ok) {
    back(new URLSearchParams({ error: result.error ?? 'grant failed' }))
  }

  back(
    new URLSearchParams({
      issued: `${parsed.data.amount} credits to ${parsed.data.email}`,
    })
  )
}
