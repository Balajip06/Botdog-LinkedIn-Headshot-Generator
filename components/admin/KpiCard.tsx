import type { ReactNode } from 'react'
import { Sparkline } from '@/components/admin/Charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

export interface KpiCardProps {
  /** Lucide icon node, rendered in a 24×24 chip. */
  icon: ReactNode
  /** Uppercase row label, e.g. "Impressions". */
  label: string
  /** Big-number value (already formatted — e.g. "12,345" or "$1.2K"). */
  value: string
  /** Trend delta vs prior period — typically a `<Delta />` element. */
  delta: ReactNode
  /** Tailwind text-* utility (controls Sparkline stroke/fill via currentColor). */
  tone: string
  /** 7-day or N-day series for the inline sparkline. */
  series: { label: string; value: number }[]
  /** Accessible label for the sparkline SVG. */
  ariaLabel: string
}

/**
 * Reusable KPI tile used across `/admin`, `/admin/engagement`, `/admin/margin`
 * (and any new diligence dashboards). Three previously-duplicated definitions
 * collapsed into one component.
 */
export function KpiCard({
  icon,
  label,
  value,
  delta,
  tone,
  series,
  ariaLabel,
}: KpiCardProps) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-muted">{icon}</span>
            {label}
          </span>
          {delta}
        </div>
        <CardTitle className="text-3xl font-extrabold tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent className={cn('px-5', tone)}>
        <Sparkline data={series} ariaLabel={ariaLabel} />
      </CardContent>
    </Card>
  )
}
