import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const BodySchema = z.object({
  generation_id: z.string().uuid(),
})

/**
 * Re-fires a failed_retryable generation using the row's stored
 * idempotency_key. Replaces the prior client-side retry which echoed
 * the key into hydration JSON (red-team L4) — the client never sees
 * the key, the server reads it from the row and re-enqueues.
 *
 * Auth: standard cookie session. The caller must own the row.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let parsed: z.infer<typeof BodySchema>
  try {
    parsed = BodySchema.parse(await request.json())
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'invalid body' },
      { status: 400 },
    )
  }

  // RLS-filtered SELECT: anon-key client only returns rows where
  // auth.uid() = user_id. Ownership check is implicit.
  const { data: gen } = await supabase
    .from('generations')
    .select('id, user_id, status, trend_id, attempts')
    .eq('id', parsed.generation_id)
    .maybeSingle()
  if (!gen) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (gen.status !== 'failed_retryable' && gen.status !== 'failed') {
    return NextResponse.json({ error: 'Not retryable' }, { status: 409 })
  }

  // Flip the row back to pending so the Edge Function picks it up
  // again. Service-role bypasses RLS so the status transition succeeds
  // even when the user-update policy doesn't permit arbitrary status
  // writes.
  const service = createServiceClient()
  const { error: updateError } = await service
    .from('generations')
    .update({ status: 'pending', error_message: null, attempts: gen.attempts + 1 })
    .eq('id', gen.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
