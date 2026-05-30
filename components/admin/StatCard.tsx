import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface StatCardProps {
  /** Lucide icon node, rendered in a 24×24 chip. */
  icon: ReactNode
  /** Uppercase row label, e.g. "Trends". */
  label: string
  /** Big-number value — numbers are auto-formatted; strings render verbatim. */
  value: number | string
  /** Optional secondary line under the value. */
  hint?: string
}

/**
 * Compact KPI tile without a sparkline. Used for counts and one-off facts
 * (e.g. "Pending suggestions: 3", "Top spend trend: Action figure in box").
 * Sister to [`KpiCard`](./KpiCard.tsx) which adds a trend sparkline.
 */
export function StatCard({ icon, label, value, hint }: StatCardProps) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="grid size-6 place-items-center rounded-md bg-muted">{icon}</span>
          {label}
        </div>
        <CardTitle className="line-clamp-2 text-2xl font-bold tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="px-5 text-xs text-muted-foreground">{hint}</CardContent>
      )}
    </Card>
  )
}
