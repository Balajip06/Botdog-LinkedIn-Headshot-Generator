#!/usr/bin/env tsx
/**
 * smoke-edge-function.ts
 *
 * Posts a synthetic Database-Webhook envelope at the deployed
 * `generate-image` Edge Function and asserts a useful response.
 *
 * What counts as a successful smoke:
 *   - The function returns HTTP 2xx, OR
 *   - The function returns 5xx with body.error mentioning "trend not found"
 *     (the synthetic trend_id will not exist — that is exactly the point;
 *      it proves the function ran, parsed the envelope, and reached the DB).
 *
 * Anything else (401, network error, 5xx with a different error, timeout) is
 * a real smoke failure and exits 1.
 *
 * Usage:
 *   pnpm smoke:edge
 *
 * Required env (read from .env.local via dotenv):
 *   NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service-role key (matches the function's
 *                                expected Authorization bearer)
 *
 * Exit codes:
 *   0 — smoke success (function reachable + envelope parsed)
 *   1 — connection failure, timeout, 401, or unexpected error shape
 *   2 — local config error (missing env vars, bad URL)
 *
 * No external dependencies beyond `dotenv` (already a devDep) + Node native fetch.
 */

import { config } from 'dotenv'

config({ path: '.env.local' })

const TIMEOUT_MS = 10_000

interface SmokeResult {
  ok: boolean
  status: number
  ms: number
  detail: string
}

interface WebhookEnvelope {
  type: 'INSERT'
  table: 'generations'
  schema: 'public'
  record: {
    id: string
    user_id: string
    trend_id: string
    trend_version: number
    idempotency_key: string
    input_payload: {
      values: Record<string, string | string[]>
      image_urls: string[]
    }
    status: 'pending'
    attempts: number
    error_message: string | null
    model_used: string | null
    cost_usd: number
    output_image_url: string | null
  }
}

function buildEnvelope(): WebhookEnvelope {
  // All UUIDs are synthetic and guaranteed not to exist. The function will
  // claim the row (no-op — row not found), then look up the trend, miss,
  // and return a "trend not found" terminal failure. We never reach Gemini.
  const synth = '00000000-0000-4000-8000-000000000000'
  return {
    type: 'INSERT',
    table: 'generations',
    schema: 'public',
    record: {
      id: synth,
      user_id: synth,
      trend_id: synth,
      trend_version: 1,
      idempotency_key: `smoke-${Date.now()}`,
      input_payload: { values: {}, image_urls: [] },
      status: 'pending',
      attempts: 0,
      error_message: null,
      model_used: null,
      cost_usd: 0,
      output_image_url: null,
    },
  }
}

async function smoke(url: string, serviceKey: string): Promise<SmokeResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = performance.now()
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/functions/v1/generate-image`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildEnvelope()),
      signal: controller.signal,
    })
    const ms = performance.now() - start
    const text = await res.text()
    let parsed: unknown = null
    try {
      parsed = JSON.parse(text)
    } catch {
      // non-JSON response — keep raw text in detail
    }

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        ms,
        detail: 'Unauthorized — WEBHOOK_SECRET does not match the function secret',
      }
    }

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, status: res.status, ms, detail: `body=${text.slice(0, 200)}` }
    }

    // 5xx with "trend not found" is the expected synthetic-id path —
    // the function claimed nothing (no matching row), but we proved it ran.
    const detail =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : text.slice(0, 200)

    if (res.status >= 500 && detail.toLowerCase().includes('trend not found')) {
      return {
        ok: true,
        status: res.status,
        ms,
        detail: `expected synthetic-id error: ${detail}`,
      }
    }

    return { ok: false, status: res.status, ms, detail: `unexpected: ${detail}` }
  } catch (err: unknown) {
    const ms = performance.now() - start
    const message = err instanceof Error ? err.message : 'unknown'
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, status: 0, ms, detail: `timeout after ${TIMEOUT_MS}ms` }
    }
    return { ok: false, status: 0, ms, detail: `network error: ${message}` }
  } finally {
    clearTimeout(timer)
  }
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.WEBHOOK_SECRET

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or WEBHOOK_SECRET in .env.local')
    process.exit(2)
  }
  if (!/^https?:\/\//.test(url)) {
    console.error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${url}`)
    process.exit(2)
  }

  console.log(`Smoking generate-image edge function at ${url}`)
  const result = await smoke(url, key)

  console.log('')
  console.log(`status:  ${result.status}`)
  console.log(`time:    ${Math.round(result.ms)}ms`)
  console.log(`detail:  ${result.detail}`)
  console.log('')

  if (result.ok) {
    console.log('Smoke PASS — function reachable and envelope parsed.')
    process.exit(0)
  }
  console.log('Smoke FAIL — see detail above.')
  process.exit(1)
}

main().catch((e: unknown) => {
  console.error('Smoke run crashed:', e)
  process.exit(1)
})
