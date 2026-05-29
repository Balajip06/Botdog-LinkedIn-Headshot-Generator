'use client'

import { Badge } from '@/components/ui/badge'

export type Status = 'pending' | 'processing' | 'completed' | 'failed' | 'failed_retryable'

interface StatusBadgeProps {
  status: Status
  attempts: number
}

export function StatusBadge({ status, attempts }: StatusBadgeProps) {
  const map: Record<Status, { label: string; cls: string }> = {
    pending: {
      label: 'Queued',
      cls: 'bg-muted text-foreground/70',
    },
    processing: {
      label: 'Generating',
      cls: 'bg-[var(--brand-cyan)]/15 text-[color:oklch(0.45_0.16_215)] dark:text-[var(--brand-cyan)] animate-pulse',
    },
    completed: {
      label: 'Done',
      cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    },
    failed_retryable: {
      label: `Retrying ${attempts}/3`,
      cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    },
    failed: {
      label: 'Failed',
      cls: 'bg-destructive/15 text-destructive',
    },
  }
  const { label, cls } = map[status]
  return <Badge className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</Badge>
}
