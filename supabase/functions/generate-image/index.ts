// Supabase Edge Function — generate-image
// Triggered by Database Webhook on `generations` INSERT.
// Deno runtime; uses Web Fetch + AbortController for portability.
//
// Configure in Supabase Dashboard:
//   1. Storage buckets `uploads` + `outputs` exist (see migration 0007)
//   2. Database Webhook: table=generations, event=INSERT,
//      URL=<edge-fn-url>, HTTP method=POST,
//      header `Authorization: Bearer <service_role>`
//   3. Function secrets: GEMINI_API_KEY, OPENAI_API_KEY, SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
//
// Model selection: the model is app-wide (app_settings.active_model), read per
// generation. On failure the OTHER provider is tried once (generateWithFallback)
// before the failure model below applies. The winning model's id + cost are recorded.
//
// Failure model per amended plan §"Phase 3" (after fallback):
//   - safety   → status='failed' (DB trigger refunds quota)
//   - timeout  → status='failed_retryable', attempts++
//   - transient→ status='failed_retryable', attempts++
//   - after 3 attempts → status='failed' (terminal, refund)
//   - orphaned in 'processing' (wall-timeout kill) → reaped by reap_stuck_processing

// @ts-expect-error Deno-only import; not resolved by Node typecheck.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'failed_retryable'

interface GenerationRow {
  id: string
  user_id: string
  trend_id: string
  trend_version: number
  idempotency_key: string
  input_payload: {
    values: Record<string, string | string[]>
    image_urls?: string[]
  }
  status: GenerationStatus
  attempts: number
  error_message: string | null
  model_used: string | null
  cost_usd: number
  output_image_url: string | null
}

interface TrendRow {
  id: string
  prompt_template: string
  // NOTE: the runtime model is global (app_settings.active_model), NOT trends.model.
  // trends.model is intentionally not selected here — it only drives admin eval previews.
  aspect_ratio: string
  version: number
}

interface AnonymousRow {
  id: string
  trend_id: string
  input_payload: {
    values: Record<string, string | string[]>
    image_urls?: string[]
  } | null
  status: GenerationStatus
  output_image_url: string | null
  cost_usd: number
  expires_at: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  // Either a generations row or an anonymous_attempts row depending on `table`;
  // narrowed at the call site via an explicit cast after the table check.
  record: Record<string, unknown>
  schema: string
  old_record?: GenerationRow
}

const MAX_ATTEMPTS = 3
// Per-MODEL timeouts (not per-position). gpt-image-2 is slow — the spike measured ~64-69s
// per call — so it needs ~85s whether it runs as the active model OR the fallback; Gemini
// is fast (~15-40s) so 45s suffices. The active + fallback run as TWO sequential calls in
// ONE Edge invocation, so the WORST-CASE chain is 85 + 45 = 130s (+ ~10s claim/upload
// overhead) — under the ~150s Supabase wall. Any wall-timeout kill that still strands a row
// in 'processing' is swept by reap_stuck_processing (migration 0035).
const OPENAI_TIMEOUT_MS = 85_000
const GEMINI_TIMEOUT_MS = 45_000
const WALL_TIMEOUT_MS = 110_000

// The model that serves customers is app-wide (app_settings.active_model), NOT
// trends.model. These maps mirror lib/gemini/cost.ts — keep them in sync by hand
// (Deno standalone can't import lib).
type ActiveModel = 'nano-banana' | 'nano-banana-pro' | 'gpt-image-2'
const COST_USD: Record<ActiveModel, number> = {
  'nano-banana': 0.0039,
  'nano-banana-pro': 0.024,
  'gpt-image-2': 0.04, // OpenAI ChatGPT Image 2 — 1024×1024 standard
}
const MODEL_ID: Record<ActiveModel, string> = {
  'nano-banana': 'gemini-3.1-flash-image', // Nano Banana 2 — validated for headshot identity fidelity
  'nano-banana-pro': 'gemini-3-pro-image', // Nano Banana Pro
  'gpt-image-2': 'gpt-image-2', // OpenAI ChatGPT Image 2 (raw id confirmed by owner)
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Shared secret check — decoupled from SUPABASE_SERVICE_ROLE_KEY rotation.
  // Set on platform via `supabase secrets set WEBHOOK_SECRET=...`; same value
  // lives in .env.local + DB webhook header.
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  const expectedAuth = `Bearer ${webhookSecret}`
  if (!webhookSecret || req.headers.get('authorization') !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = (await req.json()) as WebhookPayload
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400)
  }

  const isGeneration = payload.type === 'INSERT' && payload.table === 'generations'
  const isAnonymous = payload.type === 'INSERT' && payload.table === 'anonymous_attempts'
  if (!isGeneration && !isAnonymous) {
    return jsonResponse({ ignored: true })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  const wallTimer = setTimeout(() => {
    // No-op; consumed by individual fetch AbortControllers.
  }, WALL_TIMEOUT_MS)

  try {
    if (isAnonymous) await processAnonymous(supabase, payload.record as unknown as AnonymousRow)
    else await process(supabase, payload.record as unknown as GenerationRow)
    return jsonResponse({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown'
    return jsonResponse({ error: message }, 500)
  } finally {
    clearTimeout(wallTimer)
  }
})

/**
 * Anonymous-trial generation. Mirrors `process()` but against the
 * `anonymous_attempts` table: no quota/refund triggers, no retries (the trial is
 * one-shot per device), no push. Output lands under `outputs/anon/<id>.png` and
 * the row is stamped completed/failed so the in-card poll + /anonymous/[id] page
 * can render it.
 */
async function processAnonymous(supabase: ReturnType<typeof createClient>, anon: AnonymousRow) {
  // Claim pending -> processing so a webhook retry can't double-charge Gemini.
  const { data: claimed, error: claimError } = await supabase
    .from('anonymous_attempts')
    .update({ status: 'processing' })
    .eq('id', anon.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle()
  if (claimError) throw new Error(`anon claim failed: ${claimError.message}`)
  if (!claimed) return

  const { data: trendData, error: trendError } = await supabase
    .from('trends')
    .select('id, prompt_template, aspect_ratio, version')
    .eq('id', anon.trend_id)
    .maybeSingle<TrendRow>()
  if (trendError || !trendData) {
    await failAnonymous(supabase, anon.id, 'trend not found')
    return
  }

  const values = anon.input_payload?.values ?? {}
  const prompt = interpolate(trendData.prompt_template, values)
  const imageUrls = anon.input_payload?.image_urls ?? collectImagesFromValues(values)

  // Same global active model + fallback as the authed path. No retries — the trial is
  // one-shot — so reap_stuck_processing anchors anon orphans on created_at, not processing_at.
  const activeModel = await loadActiveModel(supabase)
  const result = await generateWithFallback(activeModel, prompt, imageUrls, trendData.aspect_ratio)
  if (!result.ok) {
    await failAnonymous(supabase, anon.id, `${result.reason}: ${result.message}`)
    return
  }

  const outputPath = `anon/${anon.id}.png`
  const { error: uploadError } = await supabase.storage
    .from('outputs')
    .upload(outputPath, result.outputPng, { contentType: 'image/png', upsert: true })
  if (uploadError) {
    await failAnonymous(supabase, anon.id, `upload: ${uploadError.message}`)
    return
  }

  // Public URL — consistent with the authed path (the `outputs` bucket is public
  // app-wide) and required so a CLAIMED result stays permanently viewable in the
  // user's creations. Trial-window enforcement (expires_at) is at the app layer
  // (status/download routes + /anonymous page strip the URL after expiry).
  const { data: publicUrl } = supabase.storage.from('outputs').getPublicUrl(outputPath)

  await supabase
    .from('anonymous_attempts')
    .update({
      status: 'completed',
      output_image_url: publicUrl.publicUrl,
      cost_usd: result.costUsd, // winning model's cost (post-fallback)
      completed_at: new Date().toISOString(),
    })
    .eq('id', anon.id)
}

async function failAnonymous(
  supabase: ReturnType<typeof createClient>,
  id: string,
  message: string
) {
  await supabase
    .from('anonymous_attempts')
    .update({ status: 'failed', completed_at: new Date().toISOString() })
    .eq('id', id)
  // No error column on anonymous_attempts — log for webhook-side observability.
  console.error(`anon ${id} failed: ${message}`)
}

async function process(supabase: ReturnType<typeof createClient>, gen: GenerationRow) {
  // 1. Claim the row by transitioning pending -> processing.
  //    Conditional update prevents double-processing if Supabase retries the webhook.
  //    `processing_at` is stamped so reap_stuck_processing (migration 0035) can detect
  //    an orphan if this invocation is killed mid-flight (e.g. fallback exceeds the wall).
  const { data: claimed, error: claimError } = await supabase
    .from('generations')
    .update({
      status: 'processing',
      attempts: gen.attempts + 1,
      processing_at: new Date().toISOString(),
    })
    .eq('id', gen.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (claimError) throw new Error(`claim failed: ${claimError.message}`)
  if (!claimed) return // Already claimed by an earlier delivery; skip silently.

  // 2. Load trend (prompt + aspect_ratio). The MODEL is global, not per-trend.
  const { data: trendData, error: trendError } = await supabase
    .from('trends')
    .select('id, prompt_template, aspect_ratio, version')
    .eq('id', gen.trend_id)
    .maybeSingle<TrendRow>()

  if (trendError || !trendData) {
    await terminalFail(supabase, gen, 'trend not found')
    return
  }

  // 3. Build prompt + collect image URLs.
  const prompt = interpolate(trendData.prompt_template, gen.input_payload.values)
  const imageUrls =
    gen.input_payload.image_urls ?? collectImagesFromValues(gen.input_payload.values)

  // 4. Generate on the admin-selected active model, with one-shot fallback to the
  //    other provider.
  const activeModel = await loadActiveModel(supabase)
  const result = await generateWithFallback(activeModel, prompt, imageUrls, trendData.aspect_ratio)

  if (!result.ok) {
    if (result.reason === 'safety') {
      await terminalFail(supabase, gen, `safety: ${result.message}`)
      return
    }
    // transient / timeout / invalid
    if (gen.attempts + 1 >= MAX_ATTEMPTS) {
      await terminalFail(
        supabase,
        gen,
        `terminal after ${MAX_ATTEMPTS} attempts: ${result.message}`
      )
    } else {
      await markRetryable(supabase, gen, result.message)
    }
    return
  }

  // 5. Upload output PNG to storage.
  const outputPath = `${gen.user_id}/${gen.id}.png`
  const { error: uploadError } = await supabase.storage
    .from('outputs')
    .upload(outputPath, result.outputPng, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) {
    if (gen.attempts + 1 >= MAX_ATTEMPTS) {
      await terminalFail(supabase, gen, `upload terminal: ${uploadError.message}`)
    } else {
      await markRetryable(supabase, gen, `upload failed: ${uploadError.message}`)
    }
    return
  }

  const { data: publicUrl } = supabase.storage.from('outputs').getPublicUrl(outputPath)

  // 6. Mark completed with the WINNING model's cost + id (post-fallback).
  await supabase
    .from('generations')
    .update({
      status: 'completed',
      output_image_url: publicUrl.publicUrl,
      cost_usd: result.costUsd,
      model_used: result.modelId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', gen.id)

  // 7. Fire-and-forget push + email dispatch via Next.js API. Best-effort —
  //    failure here does not roll back the completed generation; user can
  //    still poll via Realtime or open /me/creations.
  await dispatchNotification(gen.id)
}

async function dispatchNotification(generationId: string): Promise<void> {
  const siteUrl = Deno.env.get('SITE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!siteUrl || !serviceKey) return

  try {
    await fetch(`${siteUrl.replace(/\/$/, '')}/api/push/dispatch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ generation_id: generationId }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch {
    // Swallow — push delivery is best-effort.
  }
}

async function terminalFail(
  supabase: ReturnType<typeof createClient>,
  gen: GenerationRow,
  message: string
) {
  // Setting status='failed' fires the refund-quota trigger (migration 0003).
  await supabase
    .from('generations')
    .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
    .eq('id', gen.id)
}

async function markRetryable(
  supabase: ReturnType<typeof createClient>,
  gen: GenerationRow,
  message: string
) {
  await supabase
    .from('generations')
    .update({ status: 'failed_retryable', error_message: message })
    .eq('id', gen.id)
}

// ---- Helpers (inlined for Deno standalone) ----

function interpolate(template: string, values: Record<string, string | string[]>): string {
  return template.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (_, name: string) => {
    const v = values[name]
    if (v === undefined) return ''
    return Array.isArray(v) ? v.join(', ') : v
  })
}

function collectImagesFromValues(values: Record<string, string | string[]>): string[] {
  const urls: string[] = []
  for (const v of Object.values(values)) {
    if (typeof v === 'string' && v.startsWith('http')) urls.push(v)
    else if (Array.isArray(v)) for (const u of v) if (u.startsWith('http')) urls.push(u)
  }
  return urls
}

interface ProviderOk {
  ok: true
  outputPng: Uint8Array
}
interface ProviderFail {
  ok: false
  reason: 'safety' | 'timeout' | 'transient' | 'invalid'
  message: string
}
type ProviderResult = ProviderOk | ProviderFail

// callModel result carries the WINNING model's id + cost for the completion record.
interface ModelOk {
  ok: true
  outputPng: Uint8Array
  modelId: string
  costUsd: number
}
type ModelResult = ModelOk | ProviderFail

/** Read the app-wide active model (app_settings singleton). Default nano-banana on any miss. */
async function loadActiveModel(supabase: ReturnType<typeof createClient>): Promise<ActiveModel> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('active_model')
      .eq('id', true)
      .maybeSingle()
    const m = (data as { active_model?: string } | null)?.active_model
    if (m === 'nano-banana' || m === 'nano-banana-pro' || m === 'gpt-image-2') return m
  } catch {
    // fall through to default
  }
  return 'nano-banana'
}

/** Dispatch to the right provider; on success attach the model id + cost. The timeout is
 * derived per MODEL (gpt-image-2 is slow ~67s, Gemini fast) so it's correct whether the
 * model runs as the active call or the fallback. */
async function callModel(
  model: ActiveModel,
  prompt: string,
  imageUrls: string[],
  aspectRatio: string
): Promise<ModelResult> {
  const raw =
    model === 'gpt-image-2'
      ? await callOpenAI(MODEL_ID[model], prompt, imageUrls, aspectRatio, OPENAI_TIMEOUT_MS)
      : await callGemini(MODEL_ID[model], prompt, imageUrls, GEMINI_TIMEOUT_MS)
  if (!raw.ok) return raw
  return { ok: true, outputPng: raw.outputPng, modelId: MODEL_ID[model], costUsd: COST_USD[model] }
}

/**
 * Generate on `active`; if it fails, try the OTHER provider once (best-effort rescue for
 * outages / safety blocks). On double-failure, surface the ACTIVE model's failure so the
 * caller's retry-vs-terminal classification is driven by the configured model, not the
 * bonus attempt. Both calls are time-boxed so their SUM fits the Edge wall.
 */
async function generateWithFallback(
  active: ActiveModel,
  prompt: string,
  imageUrls: string[],
  aspectRatio: string
): Promise<ModelResult> {
  const first = await callModel(active, prompt, imageUrls, aspectRatio)
  if (first.ok) return first
  // Fall back to the OTHER PROVIDER. When OpenAI is active we drop to `nano-banana`
  // (deliberate: it's the identity-validated, fast Gemini model — not nano-banana-pro).
  // Both Gemini tiers fall back to OpenAI. Requires the other provider's key to be set,
  // else this leg no-ops. (Per-model timeouts live in callModel.)
  const other: ActiveModel = active === 'gpt-image-2' ? 'nano-banana' : 'gpt-image-2'
  const second = await callModel(other, prompt, imageUrls, aspectRatio)
  return second.ok ? second : first
}

/** Map the trend aspect ratio to an OpenAI image size (Gemini infers size from the prompt). */
function aspectToSize(aspect: string): string {
  switch (aspect) {
    case '16:9':
      return '1536x1024'
    case '3:4':
    case '9:16':
      return '1024x1536'
    default:
      return '1024x1024' // 1:1 + safe fallback
  }
}

async function callOpenAI(
  modelId: string,
  prompt: string,
  imageUrls: string[],
  aspectRatio: string,
  timeoutMs: number
): Promise<ProviderResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return { ok: false, reason: 'invalid', message: 'OPENAI_API_KEY missing' }
  if (imageUrls.length === 0) return { ok: false, reason: 'invalid', message: 'no input image' }

  // ONE timeout bounds the WHOLE call — image fetch + API — so the active + fallback
  // legs together stay under the Edge wall (the image fetch is NOT a separate budget).
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // Fetch the user's photo (headshot = 1 image) through the same SSRF guard as Gemini,
    // then hand it to images/edits as a file (image + prompt -> image preserves the face).
    let imageBlob: Blob
    let filename: string
    try {
      if (!isAllowedFetchUrl(imageUrls[0])) throw new Error(`blocked image url: ${imageUrls[0]}`)
      const imgRes = await fetch(imageUrls[0], { signal: controller.signal })
      if (!imgRes.ok) throw new Error(`image fetch ${imgRes.status}`)
      const rawMime = imgRes.headers.get('content-type')?.split(';')[0]?.trim() ?? 'image/jpeg'
      const mime = ALLOWED_INPUT_MIME.has(rawMime) ? rawMime : 'image/jpeg'
      const bytes = new Uint8Array(await imgRes.arrayBuffer())
      imageBlob = new Blob([bytes], { type: mime })
      filename = `input.${mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'}`
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, reason: 'timeout', message: 'OpenAI image fetch timed out' }
      }
      return {
        ok: false,
        reason: 'invalid',
        message: err instanceof Error ? err.message : 'image fetch failed',
      }
    }

    const form = new FormData()
    form.append('model', modelId)
    form.append('prompt', prompt)
    form.append('size', aspectToSize(aspectRatio))
    form.append('quality', 'medium')
    form.append('output_format', 'png') // storage upload + watermark step assume PNG
    form.append('moderation', 'low') // reduce benign-face rejections
    form.append('n', '1')
    form.append('image', imageBlob, filename)

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      const transient = res.status === 429 || res.status >= 500
      const isSafety = /content_policy|moderation|safety/i.test(text)
      return {
        ok: false,
        reason: isSafety ? 'safety' : transient ? 'transient' : 'invalid',
        message: `OpenAI ${res.status}: ${text.slice(0, 200)}`,
      }
    }

    interface OpenAIResponse {
      data?: Array<{ b64_json?: string }>
      error?: { message?: string; code?: string }
    }
    const json = (await res.json()) as OpenAIResponse
    if (json.error) {
      return {
        ok: false,
        reason: 'invalid',
        message: `OpenAI: ${json.error.message ?? json.error.code}`,
      }
    }
    const b64 = json.data?.[0]?.b64_json
    if (!b64) return { ok: false, reason: 'invalid', message: 'no b64_json in response' }
    return { ok: true, outputPng: decodeBase64(b64) }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout', message: 'OpenAI call timed out' }
    }
    return {
      ok: false,
      reason: 'transient',
      message: err instanceof Error ? err.message : 'unknown',
    }
  } finally {
    clearTimeout(t)
  }
}

async function callGemini(
  modelId: string,
  prompt: string,
  imageUrls: string[],
  timeoutMs: number
): Promise<ProviderResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return { ok: false, reason: 'invalid', message: 'GEMINI_API_KEY missing' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

  // ONE timeout bounds the WHOLE call — image fetch(es) + API — so the active + fallback
  // legs together stay under the Edge wall.
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    let imageParts: Array<{ inlineData: { mimeType: string; data: string } }>
    try {
      imageParts = await Promise.all(imageUrls.map((u) => fetchAsInlineData(u, controller.signal)))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, reason: 'timeout', message: 'Gemini image fetch timed out' }
      }
      return {
        ok: false,
        reason: 'invalid',
        message: err instanceof Error ? err.message : 'image fetch failed',
      }
    }

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
      safetySettings: [
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      const transient = res.status === 429 || res.status >= 500
      return {
        ok: false,
        reason: transient ? 'transient' : 'invalid',
        message: `Gemini ${res.status}: ${text.slice(0, 200)}`,
      }
    }

    interface GeminiResponse {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> }
        finishReason?: string
      }>
      promptFeedback?: { blockReason?: string }
    }
    const json = (await res.json()) as GeminiResponse
    const blocked = json.promptFeedback?.blockReason ?? json.candidates?.[0]?.finishReason
    if (blocked && blocked !== 'STOP') {
      return { ok: false, reason: 'safety', message: `Blocked: ${blocked}` }
    }

    const inline = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
    if (!inline?.data) return { ok: false, reason: 'invalid', message: 'no inlineData in response' }

    return { ok: true, outputPng: decodeBase64(inline.data) }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout', message: 'Gemini call timed out' }
    }
    return {
      ok: false,
      reason: 'transient',
      message: err instanceof Error ? err.message : 'unknown',
    }
  } finally {
    clearTimeout(t)
  }
}

const ALLOWED_INPUT_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

// SSRF guard: only fetch HTTPS URLs on our own Supabase host. The API routes
// already validate this, but the Edge Function is the component that performs
// the actual outbound fetch, so it enforces it too (defense in depth).
function isAllowedFetchUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const supaHost = new URL(Deno.env.get('SUPABASE_URL') ?? '').hostname
    return u.protocol === 'https:' && !!supaHost && u.hostname === supaHost
  } catch {
    return false
  }
}

async function fetchAsInlineData(
  url: string,
  signal?: AbortSignal
): Promise<{ inlineData: { mimeType: string; data: string } }> {
  if (!isAllowedFetchUrl(url)) throw new Error(`blocked image url: ${url}`)
  // Prefer the caller's shared abort signal (so the fetch counts against the
  // provider timeout budget); fall back to a standalone 15s cap.
  const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`image fetch ${res.status}: ${url}`)
  const rawMime = res.headers.get('content-type')?.split(';')[0]?.trim() ?? 'image/jpeg'
  const mimeType = ALLOWED_INPUT_MIME.has(rawMime) ? rawMime : 'image/jpeg'
  const bytes = new Uint8Array(await res.arrayBuffer())
  return { inlineData: { mimeType, data: encodeBase64(bytes) } }
}

function encodeBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
