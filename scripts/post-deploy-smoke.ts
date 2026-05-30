#!/usr/bin/env tsx
/**
 * post-deploy-smoke.ts
 *
 * Lightweight HTTP-only smoke tests for a freshly deployed Trendly instance.
 * Runs a subset of the docs/RUNBOOK.md 14-test verification matrix that does
 * NOT require DB writes or authenticated state.
 *
 * Usage:
 *   pnpm tsx scripts/post-deploy-smoke.ts https://yourdomain.com
 *
 * Exit code:
 *   0 — all checks passed
 *   1 — at least one check failed
 *
 * No external dependencies — uses Node 22 native fetch only.
 */

type CheckStatus = 'PASS' | 'FAIL' | 'SKIP'

interface CheckResult {
  name: string
  status: CheckStatus
  detail: string
  ms: number
}

const TIMEOUT_MS = 10_000
const LATENCY_BUDGET_MS = 2000
const HEALTH_SAMPLES = 5

function fmt(n: number): string {
  return Number.isFinite(n) ? `${Math.round(n)}ms` : 'n/a'
}

function p50(samples: number[]): number {
  if (samples.length === 0) return NaN
  const sorted = [...samples].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

async function timedFetch(
  url: string,
  init?: RequestInit,
): Promise<{ res: Response; ms: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = performance.now()
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'manual', // we want to observe 3xx ourselves
    })
    return { res, ms: performance.now() - start }
  } finally {
    clearTimeout(timer)
  }
}

function pass(name: string, detail: string, ms: number): CheckResult {
  return { name, status: 'PASS', detail, ms }
}

function fail(name: string, detail: string, ms: number): CheckResult {
  return { name, status: 'FAIL', detail, ms }
}

async function checkHealth(base: string): Promise<CheckResult> {
  const name = '1. GET /api/health returns ok+ts+db'
  try {
    const { res, ms } = await timedFetch(`${base}/api/health`)
    if (res.status !== 200) {
      return fail(name, `expected 200, got ${res.status}`, ms)
    }
    const body = (await res.json()) as Record<string, unknown>
    if (body.ok !== true || typeof body.ts !== 'string' || typeof body.db !== 'string') {
      return fail(name, `bad body shape: ${JSON.stringify(body)}`, ms)
    }
    return pass(name, `ok=${body.ok} db=${String(body.db)}`, ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

async function checkHomepage(base: string): Promise<CheckResult> {
  const name = '2. GET / returns 200'
  try {
    const { res, ms } = await timedFetch(base + '/')
    if (res.status !== 200) return fail(name, `status ${res.status}`, ms)
    return pass(name, 'homepage rendered', ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

async function checkPricing(base: string): Promise<CheckResult> {
  const name = '3. GET /pricing returns 200'
  try {
    const { res, ms } = await timedFetch(`${base}/pricing`)
    if (res.status !== 200) return fail(name, `status ${res.status}`, ms)
    return pass(name, 'pricing rendered', ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

async function checkSitemap(base: string): Promise<CheckResult> {
  const name = '4. GET /sitemap.xml returns 200 + xml content-type'
  try {
    const { res, ms } = await timedFetch(`${base}/sitemap.xml`)
    if (res.status !== 200) return fail(name, `status ${res.status}`, ms)
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('xml')) return fail(name, `content-type=${ct}`, ms)
    return pass(name, `content-type=${ct}`, ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

async function checkRobots(base: string): Promise<CheckResult> {
  const name = '5. GET /robots.txt mentions sitemap'
  try {
    const { res, ms } = await timedFetch(`${base}/robots.txt`)
    if (res.status !== 200) return fail(name, `status ${res.status}`, ms)
    const body = await res.text()
    if (!body.toLowerCase().includes('sitemap')) {
      return fail(name, 'no Sitemap directive', ms)
    }
    return pass(name, 'sitemap directive present', ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

async function checkGenerateAuthGate(base: string): Promise<CheckResult> {
  const name = '6. GET /api/generate without auth → 401'
  try {
    const { res, ms } = await timedFetch(`${base}/api/generate`)
    if (res.status !== 401) return fail(name, `expected 401, got ${res.status}`, ms)
    return pass(name, 'auth gate enforced', ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

async function checkAdminGate(base: string): Promise<CheckResult> {
  const name = '7. GET /admin without auth → 302 or 401'
  try {
    const { res, ms } = await timedFetch(`${base}/admin`)
    if (res.status !== 302 && res.status !== 307 && res.status !== 401) {
      return fail(name, `expected 302/307/401, got ${res.status}`, ms)
    }
    return pass(name, `admin gate (status=${res.status})`, ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

async function checkNotFoundTrend(base: string): Promise<CheckResult> {
  const name = '8. GET /trend/nonexistent-slug → 404'
  try {
    const slug = `nonexistent-smoke-${Date.now()}`
    const { res, ms } = await timedFetch(`${base}/trend/${slug}`)
    if (res.status !== 404) return fail(name, `expected 404, got ${res.status}`, ms)
    return pass(name, 'not-found handler works', ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

async function checkLatency(base: string): Promise<CheckResult> {
  const name = `9. /api/health p50 latency (${HEALTH_SAMPLES} samples) ≤ ${LATENCY_BUDGET_MS}ms`
  const samples: number[] = []
  let lastErr: string | null = null
  for (let i = 0; i < HEALTH_SAMPLES; i += 1) {
    try {
      const { res, ms } = await timedFetch(`${base}/api/health`)
      if (res.status !== 200) {
        lastErr = `sample ${i + 1} status ${res.status}`
        break
      }
      samples.push(ms)
    } catch (e) {
      lastErr = (e as Error).message
      break
    }
  }
  if (lastErr) return fail(name, lastErr, 0)
  const median = p50(samples)
  const detail = `samples=[${samples.map((s) => Math.round(s)).join(',')}] p50=${fmt(median)}`
  if (median > LATENCY_BUDGET_MS) return fail(name, detail, median)
  return pass(name, detail, median)
}

async function checkCSP(base: string): Promise<CheckResult> {
  const name = '10. Homepage response includes content-security-policy header'
  try {
    const { res, ms } = await timedFetch(base + '/')
    const csp = res.headers.get('content-security-policy')
    if (!csp) return fail(name, 'header missing', ms)
    return pass(name, `csp length=${csp.length}`, ms)
  } catch (e) {
    return fail(name, (e as Error).message, 0)
  }
}

function renderTable(results: CheckResult[]): string {
  const nameWidth = Math.max(...results.map((r) => r.name.length))
  const lines: string[] = []
  lines.push('')
  lines.push(
    `${'CHECK'.padEnd(nameWidth)}  ${'STATUS'.padEnd(6)}  ${'TIME'.padStart(8)}  DETAIL`,
  )
  lines.push(
    `${'-'.repeat(nameWidth)}  ${'-'.repeat(6)}  ${'-'.repeat(8)}  ${'-'.repeat(40)}`,
  )
  for (const r of results) {
    lines.push(
      `${r.name.padEnd(nameWidth)}  ${r.status.padEnd(6)}  ${fmt(r.ms).padStart(8)}  ${r.detail}`,
    )
  }
  return lines.join('\n')
}

async function main(): Promise<void> {
  const rawArg = process.argv[2]
  if (!rawArg) {
    console.error('Usage: pnpm tsx scripts/post-deploy-smoke.ts <BASE_URL>')
    console.error('Example: pnpm tsx scripts/post-deploy-smoke.ts https://trendly.example.com')
    process.exit(2)
  }
  const base = rawArg.replace(/\/+$/, '')
  if (!/^https?:\/\//.test(base)) {
    console.error(`Invalid URL: ${rawArg}. Must start with http:// or https://`)
    process.exit(2)
  }

  console.log(`Running post-deploy smoke against ${base}`)
  const t0 = performance.now()

  const results: CheckResult[] = []
  results.push(await checkHealth(base))
  results.push(await checkHomepage(base))
  results.push(await checkPricing(base))
  results.push(await checkSitemap(base))
  results.push(await checkRobots(base))
  results.push(await checkGenerateAuthGate(base))
  results.push(await checkAdminGate(base))
  results.push(await checkNotFoundTrend(base))
  results.push(await checkLatency(base))
  results.push(await checkCSP(base))

  const totalMs = performance.now() - t0
  const failed = results.filter((r) => r.status === 'FAIL')

  console.log(renderTable(results))
  console.log('')
  console.log(
    `Result: ${results.length - failed.length}/${results.length} passed in ${fmt(totalMs)}`,
  )

  if (failed.length > 0) {
    console.log(`Failed checks:`)
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
    process.exit(1)
  }
  process.exit(0)
}

main().catch((e: unknown) => {
  console.error('Smoke run crashed:', e)
  process.exit(1)
})
