import { CreditCard, Filter, Mail, Sparkles, UserPlus, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { BarChart } from '@/components/admin/Charts'
import { KpiCard } from '@/components/admin/KpiCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAcquisitionFunnel, getActiveSubscribers } from '@/lib/analytics/funnel'
import { BOTDOG_PLAN } from '@/lib/payments/subscription'
import { createServiceClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils/cn'

export const dynamic = 'force-dynamic'

const VALID_RANGES = [7, 30, 90] as const
type Range = (typeof VALID_RANGES)[number]

interface AcquisitionPageProps {
  searchParams: Promise<{ range?: string; mockOverride?: string }>
}

function parseRange(raw: string | undefined): Range {
  const n = raw ? Number(raw) : 7
  return (VALID_RANGES as readonly number[]).includes(n) ? (n as Range) : 7
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export default async function AdminAcquisitionPage({ searchParams }: AcquisitionPageProps) {
  const { range: rangeRaw, mockOverride } = await searchParams
  const range = parseRange(rangeRaw)
  const forceMock = mockOverride === '1'

  // Service-role: email_leads + anonymous_attempts are RLS deny-all to the
  // authed client, so the funnel must read with the service-role client.
  const supabase = createServiceClient()
  const [funnel, subscribers] = await Promise.all([
    getAcquisitionFunnel(supabase, range, { forceMock }),
    getActiveSubscribers(supabase, { forceMock }),
  ])

  const mrrUsd = (subscribers.count * BOTDOG_PLAN.priceCents) / 100
  const topCount = funnel.stages[0]?.count ?? 0

  const stageSeries = (field: 'anonCreated' | 'emailEntered' | 'accountCreated' | 'paid') =>
    funnel.daily.map((d) => ({ label: d.label, value: d[field] }))

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
          Growth
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-gradient-hero">Acquisition</span>
            </h1>
            {funnel.isMock && !forceMock && (
              <Badge
                variant="outline"
                className="rounded-full border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
              >
                demo data
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <DataSourceToggle forceMock={forceMock} range={range} />
            <RangeToggle range={range} forceMock={forceMock} />
            <p className="text-muted-foreground text-xs">UTC · refreshed on load</p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          The full funnel from anonymous try → email capture → signup → claim → Botdog plan
          subscription. Switches to real numbers as the tables fill; until then it runs on
          deterministic demo data so the layout stays meaningful.
        </p>
      </header>

      {forceMock && (
        <div
          role="status"
          className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
        >
          Viewing demo data — flip back to live before showing diligence.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Mail className="size-4" />}
          label={`Emails captured · ${range}d`}
          value={formatNumber(funnel.emailsCaptured)}
          delta={<span className="text-muted-foreground text-xs">to unlock more</span>}
          tone="text-[var(--brand-grad-1)]"
          series={stageSeries('emailEntered')}
          ariaLabel="Daily emails captured"
        />
        <KpiCard
          icon={<UserPlus className="size-4" />}
          label={`Accounts · ${range}d`}
          value={formatNumber(funnel.stages.find((s) => s.key === 'account_created')?.count ?? 0)}
          delta={<span className="text-muted-foreground text-xs">magic-link signups</span>}
          tone="text-[var(--brand-cyan)]"
          series={stageSeries('accountCreated')}
          ariaLabel="Daily accounts created"
        />
        <KpiCard
          icon={<CreditCard className="size-4" />}
          label={`Subscribed · ${range}d`}
          value={formatNumber(funnel.paidUsers)}
          delta={<span className="text-muted-foreground text-xs">{formatPct(funnel.emailToPaidRate)} of emails</span>}
          tone="text-emerald-500"
          series={stageSeries('paid')}
          ariaLabel="Daily new subscriptions"
        />
        <KpiCard
          icon={<Sparkles className="size-4" />}
          label="Active subscribers · MRR"
          value={formatNumber(subscribers.count)}
          delta={<span className="text-muted-foreground text-xs">{formatUsd(mrrUsd)} MRR</span>}
          tone="text-[var(--brand-grad-2)]"
          series={stageSeries('paid')}
          ariaLabel="Active subscribers"
        />
      </div>

      {/* Funnel bars */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Filter className="size-4 text-[var(--brand-grad-1)]" />
            Conversion funnel · {range} days
          </CardTitle>
          <CardDescription className="text-xs">
            Each stage as a share of anonymous tries · step conversion vs the prior stage
          </CardDescription>
        </CardHeader>
        <ul className="divide-border/60 divide-y">
          {funnel.stages.map((stage, idx) => {
            const widthPct = topCount === 0 ? 0 : (stage.count / topCount) * 100
            const stepRate = idx === 0 ? null : funnel.conversions[idx - 1]?.rate ?? null
            return (
              <li key={stage.key} className="flex flex-col gap-2 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-muted text-muted-foreground grid size-7 shrink-0 place-items-center rounded-lg font-mono text-xs">
                      {idx + 1}
                    </span>
                    <p className="text-foreground truncate font-semibold">{stage.label}</p>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-3 font-mono text-xs tabular-nums">
                    {stepRate != null && (
                      <span className="text-muted-foreground">{formatPct(stepRate)} ↘</span>
                    )}
                    <span className="text-foreground font-semibold">{formatNumber(stage.count)}</span>
                  </div>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--brand-grad-1)] to-[var(--brand-grad-2)]"
                    style={{ width: `${Math.max(2, widthPct)}%` }}
                    aria-hidden="true"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* Daily acquisition chart */}
      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardDescription className="text-xs tracking-[0.18em] uppercase">
            Daily flow · {range} days
          </CardDescription>
          <CardTitle className="text-xl font-bold">Emails captured vs subscribed</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <BarChart
            ariaLabel="Daily emails captured and subscriptions"
            data={stageSeries('emailEntered')}
            secondary={{
              data: stageSeries('paid'),
              label: 'Subscribed',
              className: 'text-emerald-500',
            }}
            primaryLabel="Emails"
            primaryClassName="text-[var(--brand-grad-1)]"
          />
        </CardContent>
      </Card>

      {/* Conversion table */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-lg font-bold">Step conversion</CardTitle>
          <CardDescription className="text-xs">
            From-stage → to-stage drop-off across the funnel
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border/60 bg-muted/30 text-muted-foreground border-b text-left text-[10px] tracking-wider uppercase">
                <th className="px-5 py-2.5 font-semibold">Step</th>
                <th className="px-3 py-2.5 text-right font-semibold">From</th>
                <th className="px-3 py-2.5 text-right font-semibold">To</th>
                <th className="px-5 py-2.5 text-right font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {funnel.conversions.map((c) => {
                const fromLabel = funnel.stages.find((s) => s.key === c.fromKey)?.label ?? c.fromKey
                const toLabel = funnel.stages.find((s) => s.key === c.toKey)?.label ?? c.toKey
                return (
                  <tr key={`${c.fromKey}->${c.toKey}`} className="border-border/40 border-b">
                    <td className="px-5 py-3 align-middle">
                      <span className="text-foreground font-medium">{fromLabel}</span>
                      <span className="text-muted-foreground"> → {toLabel}</span>
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-right align-middle font-mono text-xs tabular-nums">
                      {formatNumber(c.fromCount)}
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-right align-middle font-mono text-xs tabular-nums">
                      {formatNumber(c.toCount)}
                    </td>
                    <td className="px-5 py-3 text-right align-middle font-mono text-xs font-semibold tabular-nums">
                      {formatPct(c.rate)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <Wand2 className="size-3.5" />
        Email capture writes to <code className="font-mono">email_leads</code> on every submission;
        “Subscribed” counts distinct <code className="font-mono">webhook_events</code> subscription
        checkouts. Active subscribers + MRR read{' '}
        <code className="font-mono">profiles.subscription_status</code>.
      </p>
    </section>
  )
}

interface ToggleProps {
  forceMock: boolean
  range: Range
}

function DataSourceToggle({ forceMock, range }: ToggleProps) {
  const realHref = `/admin/acquisition?range=${range}`
  const mockHref = `/admin/acquisition?range=${range}&mockOverride=1`
  return (
    <div
      className="border-border/60 bg-muted/40 inline-flex items-center gap-1 rounded-full border p-1"
      aria-label="Data source"
    >
      <Link
        href={realHref}
        aria-current={!forceMock ? 'page' : undefined}
        className={cn(
          'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
          !forceMock
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Real data
      </Link>
      <Link
        href={mockHref}
        aria-current={forceMock ? 'page' : undefined}
        className={cn(
          'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
          forceMock
            ? 'bg-amber-400/20 text-amber-800 shadow-sm dark:text-amber-300'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Demo data
      </Link>
    </div>
  )
}

function RangeToggle({ range, forceMock }: ToggleProps) {
  const mockSuffix = forceMock ? '&mockOverride=1' : ''
  return (
    <div
      className="border-border/60 bg-muted/40 inline-flex items-center gap-1 rounded-lg border p-1"
      aria-label="Range selector"
    >
      {VALID_RANGES.map((opt) => {
        const active = opt === range
        return (
          <Link
            key={opt}
            href={`/admin/acquisition?range=${opt}${mockSuffix}`}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-current={active ? 'page' : undefined}
          >
            {opt}d
          </Link>
        )
      })}
    </div>
  )
}
