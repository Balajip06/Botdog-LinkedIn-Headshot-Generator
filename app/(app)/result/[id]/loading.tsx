import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <section aria-hidden="true" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Title row */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-2/3" />
      </div>

      {/* Large canvas */}
      <Skeleton className="aspect-square w-full rounded-3xl" />

      {/* Action button row */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-11 w-32 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>

      {/* Share burst grid */}
      <div className="rounded-3xl border border-border/60 bg-card/40 p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  )
}
