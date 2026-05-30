import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import type { PublicTrend } from '@/lib/trends/repository'

interface TrendRailProps {
  trends: PublicTrend[]
  selectedSlug: string | null
}

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

function isNewTrend(activatedAt: string | null): boolean {
  if (!activatedAt) return false
  const ts = new Date(activatedAt).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < NEW_WINDOW_MS
}

/**
 * Studio thumbnail rail. Renders every active trend as a clickable card with
 * a "NEW" badge for trends activated in the last 14 days.
 *
 * Click → `/me/studio?trend=<slug>#upload` so the URL stays the canonical
 * source of selection state and the page scrolls down to the upload section.
 */
export function TrendRail({ trends, selectedSlug }: TrendRailProps) {
  return (
    <section aria-labelledby="studio-pick" className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2
          id="studio-pick"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          Pick a trend
        </h2>
        <p className="text-xs text-muted-foreground">{trends.length} trends live</p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {trends.map((trend) => {
          const isSelected = trend.slug === selectedSlug
          const isNew = isNewTrend(trend.activated_at)
          const thumb = trend.thumbnail_url ?? trend.sample_after_url
          return (
            <li key={trend.id}>
              <Link
                href={`/me/studio?trend=${trend.slug}#upload`}
                aria-current={isSelected ? 'true' : undefined}
                className={cn(
                  'group relative block overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-all',
                  'hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                  isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary'
                )}
              >
                <div className="relative aspect-square">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-hero" aria-hidden="true" />
                  )}

                  {isNew && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                      New
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 px-3 py-2">
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">{trend.title}</p>
                  {trend.description && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{trend.description}</p>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
