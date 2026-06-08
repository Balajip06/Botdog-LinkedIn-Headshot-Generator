'use client'

import { ImageIcon, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { InlineGenerator } from '@/components/generate/InlineGenerator'
import type { PublicTrend } from '@/lib/trends/repository'

export interface RecentCreation {
  id: string
  output_image_url: string | null
}

interface AccountStudioProps {
  trend: Pick<PublicTrend, 'slug' | 'input_schema' | 'model'> | null
  userId: string
  credits: number
  freeUsedThisWeek: number
  freeWeekly: number
  recent: RecentCreation[]
  /** Dev MOCK mode — forwarded to InlineGenerator to short-circuit the pipeline. */
  mock?: boolean
}

/**
 * Right-panel of the account page. One persistent studio surface: the
 * uploader/generator sits at the top (the same InlineGenerator used on the
 * homepage, in its wide `split` layout), and the user's prior headshots collect
 * in a horizontal strip below it. After a real generation, `onResult` refreshes
 * the server data so the new headshot appears in the strip.
 */
export function AccountStudio({
  trend,
  userId,
  credits,
  freeUsedThisWeek,
  freeWeekly,
  recent,
  mock = false,
}: AccountStudioProps) {
  const router = useRouter()

  const quotaLabel =
    credits > 0 ? `${credits} credits` : `${Math.max(0, freeWeekly - freeUsedThisWeek)} free this week`

  const onResult = useCallback(() => router.refresh(), [router])

  const withImages = recent.filter((r) => r.output_image_url)

  return (
    <div className="border-border/60 bg-card shadow-soft rounded-3xl border p-6 sm:p-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">New headshot</h2>
        <span className="bg-muted text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
          <Sparkles className="size-3" />
          {quotaLabel}
        </span>
      </header>

      {trend ? (
        <InlineGenerator
          trend={{ slug: trend.slug, input_schema: trend.input_schema, model: trend.model }}
          userId={userId}
          mock={mock}
          fullWidth
          onResult={onResult}
        />
      ) : (
        <p className="text-muted-foreground text-sm">The generator is warming up…</p>
      )}

      <div className="border-border/60 mt-8 border-t pt-6">
        <h3 className="mb-3 text-sm font-semibold">Your headshots</h3>
        {withImages.length > 0 ? (
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {withImages.map((c) => (
              <li key={c.id} className="shrink-0">
                <Link
                  href={`/result/${c.id}`}
                  className="group border-border/60 bg-muted hover:shadow-pop relative block size-24 overflow-hidden rounded-2xl border transition-transform hover:-translate-y-1"
                >
                  <Image
                    src={c.output_image_url as string}
                    alt="Your headshot"
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-border/60 bg-muted/30 text-muted-foreground flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center">
            <ImageIcon className="size-6" />
            <p className="text-sm">No headshots yet — make your first one above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
