import { Skeleton } from '@/components/ui/skeleton'

/**
 * /me/studio streaming skeleton — header + 15-tile rail + empty/upload card.
 */
export default function StudioLoading() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </li>
          ))}
        </ul>
      </section>

      <div className="border-border/60 bg-card/30 flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-12">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  )
}
