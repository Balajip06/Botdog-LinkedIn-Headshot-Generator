import type { Metadata } from 'next'
import Link from 'next/link'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

// 5-minute ISR — Stripe status page enforces a similar cadence, and we
// don't want to hammer it from every status-page visit.
export const revalidate = 300

interface HealthBody {
  ok: boolean
  ts: string
  version: string | null
  checks: {
    db: 'ok' | 'fail'
    db_latency_ms: number | null
  }
}

type SystemStatus = 'operational' | 'degraded' | 'down' | 'unknown' | 'not_configured'

interface SystemCard {
  name: string
  status: SystemStatus
  detail: string
  note?: string
}

interface IncidentEntry {
  filename: string
  date: string
  title: string
  href: string
}

const STRIPE_STATUS_URL = 'https://status.stripe.com/api/v2/status.json'
const EDGE_FN_PATH = '/functions/v1/generate-image'

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const title = 'Status — Trendly'
  const description = 'Live status of Trendly’s core systems.'
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/status` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/status`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

async function fetchHealth(): Promise<HealthBody | null> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${siteUrl}/api/health`, { cache: 'no-store' })
    // 503 still returns a JSON body — read it either way.
    const body = (await res.json()) as HealthBody
    return body
  } catch {
    return null
  }
}

/**
 * Probe the Supabase Edge Function with a HEAD request. We expect any of
 * 200/204 (rare HEAD support), 401 (auth required), or 405 (method not
 * allowed) — all indicate the function is reachable and the runtime is
 * up. Anything in 5xx territory or a network error means actual trouble.
 */
async function probeEdgeFunction(): Promise<{
  status: SystemStatus
  detail: string
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return {
      status: 'not_configured',
      detail: 'Edge Function URL not configured for this environment.',
    }
  }
  const url = `${supabaseUrl.replace(/\/$/, '')}${EDGE_FN_PATH}`
  const startedAt = Date.now()
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    const elapsedMs = Date.now() - startedAt
    const isAliveCode =
      res.status === 200 || res.status === 204 || res.status === 401 || res.status === 405
    if (isAliveCode) {
      if (elapsedMs > 2000) {
        return {
          status: 'degraded',
          detail: `Edge Function responding slowly (${elapsedMs} ms).`,
        }
      }
      return {
        status: 'operational',
        detail: `Edge Function responding in ${elapsedMs} ms.`,
      }
    }
    if (res.status >= 500) {
      return {
        status: 'degraded',
        detail: `Edge Function returned ${res.status}.`,
      }
    }
    return {
      status: 'operational',
      detail: `Edge Function reachable (${res.status}, ${elapsedMs} ms).`,
    }
  } catch {
    return {
      status: 'down',
      detail: 'Edge Function unreachable — network error or timeout.',
    }
  }
}

interface StripeStatusBody {
  status?: { indicator?: 'none' | 'minor' | 'major' | 'critical' }
}

/**
 * Read https://status.stripe.com/api/v2/status.json. Cached for 5 minutes
 * via Next's fetch revalidate so the upstream call fires at most every
 * 5 min per build/edge node.
 */
async function probeStripeStatus(): Promise<{
  status: SystemStatus
  detail: string
}> {
  try {
    const res = await fetch(STRIPE_STATUS_URL, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      return { status: 'unknown', detail: `Stripe status API returned ${res.status}.` }
    }
    const body = (await res.json()) as StripeStatusBody
    const indicator = body.status?.indicator ?? 'none'
    if (indicator === 'none') {
      return { status: 'operational', detail: 'Stripe reports all systems operational.' }
    }
    if (indicator === 'minor') {
      return { status: 'degraded', detail: 'Stripe reports a minor incident.' }
    }
    return { status: 'down', detail: `Stripe reports a ${indicator} incident.` }
  } catch {
    return { status: 'unknown', detail: 'Stripe status unavailable.' }
  }
}

/**
 * Filenames follow `YYYY-MM-DD-<slug>.md`. Anything else (e.g. README.md)
 * is skipped. We sort descending by filename — date prefix gives a clean
 * lexical sort.
 */
async function loadRecentIncidents(): Promise<IncidentEntry[]> {
  const dir = path.join(process.cwd(), 'docs', 'incidents')
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const incidents: IncidentEntry[] = []
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!entry.name.endsWith('.md')) continue
      const match = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/.exec(entry.name)
      if (!match) continue
      const date = match[1]
      const slug = match[2]
      const title = slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
      incidents.push({
        filename: entry.name,
        date,
        title,
        href: `https://github.com/Balajip06/Trend-Image-Generator/blob/main/docs/incidents/${entry.name}`,
      })
    }
    incidents.sort((a, b) => (a.filename < b.filename ? 1 : -1))
    return incidents.slice(0, 5)
  } catch {
    return []
  }
}

function statusDotClass(status: SystemStatus): string {
  if (status === 'operational') return 'bg-emerald-500'
  if (status === 'degraded') return 'bg-amber-500'
  if (status === 'down') return 'bg-red-500'
  if (status === 'not_configured') return 'bg-muted-foreground/50'
  return 'bg-amber-500'
}

function statusLabel(status: SystemStatus): string {
  if (status === 'operational') return 'Operational'
  if (status === 'degraded') return 'Degraded'
  if (status === 'down') return 'Down'
  if (status === 'not_configured') return 'Not configured'
  return 'Unknown'
}

export default async function StatusPage() {
  const [health, edgeProbe, stripeProbe, incidents] = await Promise.all([
    fetchHealth(),
    probeEdgeFunction(),
    probeStripeStatus(),
    loadRecentIncidents(),
  ])

  const appCard: SystemCard = health
    ? {
        name: 'App',
        status: health.ok ? 'operational' : 'degraded',
        detail: health.ok
          ? `Database responding in ${health.checks.db_latency_ms ?? '?'} ms.`
          : 'Database check failed. Investigating.',
      }
    : {
        name: 'App',
        status: 'unknown',
        detail: 'Status check unavailable from this environment.',
      }

  const generationCard: SystemCard = {
    name: 'Generation',
    status: edgeProbe.status,
    detail: edgeProbe.detail,
  }

  const paymentsCard: SystemCard = {
    name: 'Payments',
    status: stripeProbe.status,
    detail: stripeProbe.detail,
  }

  const cards: SystemCard[] = [appCard, generationCard, paymentsCard]

  return (
    <div className="relative">
      <div
        aria-hidden
        className="bg-gradient-spotlight pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] opacity-20 blur-3xl"
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-16 px-6 pt-16 pb-24">
        {/* Hero */}
        <section className="flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            System <span className="text-gradient-hero">status</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Live status of Trendly&apos;s core systems.
          </p>
        </section>

        {/* Cards */}
        <section className="grid gap-6 sm:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.name}
              className="border-border/60 bg-card flex flex-col gap-3 rounded-3xl border p-6"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`size-2.5 rounded-full ${statusDotClass(card.status)}`}
                />
                <h2 className="text-lg font-semibold tracking-tight">{card.name}</h2>
              </div>
              <p className="text-sm font-medium">{statusLabel(card.status)}</p>
              <p className="text-muted-foreground text-sm">{card.detail}</p>
              {card.note ? (
                <p
                  title={card.note}
                  className="mt-auto inline-flex w-fit items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
                >
                  {card.note}
                </p>
              ) : null}
            </article>
          ))}
        </section>

        {/* Recent incidents */}
        <section className="border-border/60 bg-card/60 flex flex-col gap-4 rounded-3xl border p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">Recent incidents</h2>
          {incidents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No incidents in the last 90 days.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {incidents.map((incident) => (
                <li
                  key={incident.filename}
                  className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <time
                    dateTime={incident.date}
                    className="text-muted-foreground font-mono text-xs tabular-nums"
                  >
                    {incident.date}
                  </time>
                  <a
                    href={incident.href}
                    className="hover:text-foreground text-sm font-medium underline underline-offset-4"
                  >
                    {incident.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer note */}
        <section className="border-border/60 bg-gradient-spotlight/20 flex flex-col items-start gap-3 rounded-3xl border p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">Stay informed</h2>
          <p className="text-muted-foreground text-sm">
            For real-time monitoring, follow{' '}
            <a
              href="https://x.com/trendly_status"
              className="hover:text-foreground underline underline-offset-4"
            >
              @trendly_status
            </a>{' '}
            on X. For incident response, see our{' '}
            <a
              href="https://github.com/Balajip06/Trend-Image-Generator/blob/main/docs/incident_response.md"
              className="hover:text-foreground underline underline-offset-4"
            >
              SOP
            </a>
            .
          </p>
          <Link
            href="/contact"
            className="bg-foreground text-background inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Report an issue →
          </Link>
        </section>
      </main>
    </div>
  )
}
