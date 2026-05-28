import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { parseIdempotencyKey } from '@/lib/idempotency'
import { generationIpLimiter } from '@/lib/rate-limit'
import { interpolatePrompt, collectImageInputs, type TrendInputValues } from '@/lib/trends/interpolate'
import { TrendInputSchema } from '@/lib/trends/input-schema'
import { getActiveTrendBySlug } from '@/lib/trends/repository'

export const runtime = 'nodejs'

const BodySchema = z.object({
  trend_slug: z.string().min(1).max(120),
  values: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
})

export async function POST(request: NextRequest) {
  // 1. Idempotency
  const idem = parseIdempotencyKey(request.headers)
  if (!idem.ok || !idem.key) {
    return NextResponse.json({ error: idem.error ?? 'bad idempotency key' }, { status: 400 })
  }

  // 2. Per-IP rate limit (no-op when Upstash creds missing)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = await generationIpLimiter.limit(`ip:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // 3. Auth
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // 4. Body validation
  let parsedBody: z.infer<typeof BodySchema>
  try {
    const json = await request.json()
    parsedBody = BodySchema.parse(json)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'invalid body'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 5. Trend fetch (RLS-filtered: only active + not expired)
  const trend = await getActiveTrendBySlug(parsedBody.trend_slug)
  if (!trend) {
    return NextResponse.json({ error: 'Trend not found or inactive' }, { status: 404 })
  }

  // 6. Validate values against the trend's input_schema (defence in depth — DB also checks).
  const schemaCheck = TrendInputSchema.safeParse(trend.input_schema)
  if (!schemaCheck.success) {
    return NextResponse.json({ error: 'Trend input_schema corrupt' }, { status: 500 })
  }

  // 7. Build prompt + image URL list. Validation throws on missing required.
  const values = parsedBody.values as TrendInputValues
  let _imageUrls: string[]
  try {
    _imageUrls = collectImageInputs(schemaCheck.data, values)
    interpolatePrompt(/* prompt template lives on full trend row */ '', schemaCheck.data, values)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'invalid input' },
      { status: 400 }
    )
  }

  // 8. Insert generation row. UNIQUE (user_id, idempotency_key) makes replay safe;
  //    BEFORE-INSERT trigger consumes quota and raises on exhaustion.
  //    Cast required until `pnpm supabase:types` regenerates strict Database types.
  const insertRow = {
    user_id: user.id,
    trend_id: trend.id,
    trend_version: 1, // TODO Phase 3 impl: read from full trend row
    idempotency_key: idem.key,
    input_payload: { values, image_urls: _imageUrls },
    status: 'pending',
  } as never

  const { data: inserted, error: insertError } = await supabase
    .from('generations')
    .insert(insertRow)
    .select('id')
    .maybeSingle()

  if (insertError) {
    if (insertError.message.includes('duplicate key')) {
      // Idempotency replay — fetch the existing row by (user_id, idempotency_key)
      const { data: existing } = await supabase
        .from('generations')
        .select('id')
        .eq('user_id', user.id)
        .eq('idempotency_key', idem.key)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ generation_id: (existing as { id: string }).id, replayed: true })
      }
    }
    if (insertError.message.includes('quota exhausted')) {
      return NextResponse.json({ error: 'Out of credits' }, { status: 402 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  if (!inserted) {
    return NextResponse.json({ error: 'Insert returned no row' }, { status: 500 })
  }

  // Supabase DB webhook → Edge Function picks up the new row and calls Gemini.
  return NextResponse.json({ generation_id: (inserted as { id: string }).id })
}
