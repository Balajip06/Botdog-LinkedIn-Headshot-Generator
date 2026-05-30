import { TrendRail } from '@/components/trends/TrendRail'
import { TrendRunner } from '@/components/trends/TrendRunner'
import { TrendStudioEmpty } from '@/components/trends/TrendStudioEmpty'
import { getActiveTrendBySlug, listActiveTrends } from '@/lib/trends/repository'

export const dynamic = 'force-dynamic'

interface StudioPageProps {
  searchParams?: Promise<{ trend?: string | string[] }>
}

function pickSlug(raw: string | string[] | undefined): string | null {
  if (!raw) return null
  const slug = Array.isArray(raw) ? raw[0] : raw
  return slug?.trim().length ? slug : null
}

/**
 * /me/studio — the unified authed dashboard.
 *
 *   Top: trend thumbnail rail (15 active trends, "NEW" badge on recent ones)
 *   Bottom: upload form for ?trend=<slug>, or empty-state when no selection
 *
 * Selection state lives in the URL (`?trend=<slug>`) — bookmarkable + lets the
 * RSC re-render swap the upload section without client state. Each thumbnail
 * is a `<Link>` to `/me/studio?trend=<slug>#upload`, so the `#upload` anchor
 * scrolls the page down to the form on click.
 *
 * Middleware (`lib/supabase/middleware.ts`) gates `/me/*` to authed users;
 * unauth visitors are redirected to `/login?next=/me/studio` upstream.
 */
export default async function StudioPage({ searchParams }: StudioPageProps) {
  const params = (await searchParams) ?? {}
  const selectedSlug = pickSlug(params.trend)

  const [trends, selectedTrend] = await Promise.all([
    listActiveTrends(),
    selectedSlug ? getActiveTrendBySlug(selectedSlug) : Promise.resolve(null),
  ])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
          Studio
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Pick a <span className="text-gradient-hero">trend</span> and go
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Every active trend is here. Tap one, drop a photo, get a result in seconds.
        </p>
      </header>

      <TrendRail trends={trends} selectedSlug={selectedTrend?.slug ?? null} />

      {selectedTrend ? (
        <section
          id="upload"
          aria-labelledby="upload-heading"
          className="border-border/60 bg-card shadow-soft flex scroll-mt-20 flex-col gap-4 rounded-3xl border p-6 sm:p-8"
        >
          <header className="flex flex-col gap-1.5">
            <h2 id="upload-heading" className="text-2xl font-extrabold tracking-tight">
              {selectedTrend.title}
            </h2>
            {selectedTrend.description && (
              <p className="text-muted-foreground text-sm">{selectedTrend.description}</p>
            )}
          </header>
          <TrendRunner trend={selectedTrend} />
        </section>
      ) : (
        <TrendStudioEmpty />
      )}
    </div>
  )
}
