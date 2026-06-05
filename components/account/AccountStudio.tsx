'use client'

import { ImageIcon, Plus, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { GradientButton } from '@/components/brand/GradientButton'
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
 * Right-panel of the account page. Images-first: shows the user's recent
 * headshots + remaining quota, with a "Generate more" button that reveals the
 * uploader (the same InlineGenerator used on the homepage). Returning from the
 * generator refreshes the server data so a just-made headshot shows in the strip.
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
  const [mode, setMode] = useState<'list' | 'generate'>('list')

  const quotaLabel =
    credits > 0 ? `${credits} credits` : `${Math.max(0, freeWeekly - freeUsedThisWeek)} free this week`

  const backToList = useCallback(() => {
    setMode('list')
    router.refresh()
  }, [router])

  const withImages = recent.filter((r) => r.output_image_url)

  return (
    <div className="border-border/60 bg-card shadow-soft rounded-3xl border p-6 sm:p-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">{mode === 'generate' ? 'New headshot' : 'Your headshots'}</h2>
        <span className="bg-muted text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
          <Sparkles className="size-3" />
          {quotaLabel}
        </span>
      </header>

      {mode === 'generate' ? (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={backToList}
            className="text-muted-foreground hover:text-foreground self-start text-sm font-medium"
          >
            ← Your headshots
          </button>
          {trend ? (
            <InlineGenerator
              trend={{ slug: trend.slug, input_schema: trend.input_schema, model: trend.model }}
              userId={userId}
              mock={mock}
            />
          ) : (
            <p className="text-muted-foreground text-sm">The generator is warming up…</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {withImages.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {withImages.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/result/${c.id}`}
                    className="group border-border/60 bg-muted hover:shadow-pop relative block aspect-square overflow-hidden rounded-2xl border transition-transform hover:-translate-y-1"
                  >
                    <Image
                      src={c.output_image_url as string}
                      alt="Your headshot"
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-border/60 bg-muted/30 text-muted-foreground flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
              <ImageIcon className="size-6" />
              <p className="text-sm">No headshots yet — make your first one.</p>
            </div>
          )}

          <GradientButton type="button" size="lg" className="w-full" onClick={() => setMode('generate')}>
            <Plus className="size-4" /> Generate more
          </GradientButton>
        </div>
      )}
    </div>
  )
}
