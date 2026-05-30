import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <section aria-hidden="true" className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-3 w-48" />
        </div>
      </header>

      {/* KPI tile row — 4 tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-12 w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* Quota blocks KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-12 w-full rounded-md" />
        </div>
      </div>

      {/* Charts row — 2 charts side-by-side */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-card rounded-xl border py-5 shadow-sm lg:col-span-2">
          <div className="px-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-64" />
          </div>
          <div className="mt-4 px-5">
            <Skeleton className="h-56 w-full rounded-md" />
          </div>
        </div>
        <div className="bg-card rounded-xl border py-5 shadow-sm">
          <div className="px-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-40" />
          </div>
          <div className="mt-4 px-5">
            <Skeleton className="mx-auto size-56 rounded-full" />
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-card rounded-xl border py-5 shadow-sm">
        <div className="px-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-6 w-56" />
        </div>
        <div className="mt-4 px-5">
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
      </div>

      {/* StatCard row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card flex flex-col gap-2 rounded-xl border p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* AdminTile grid — 6 tiles */}
      <div>
        <Skeleton className="mb-3 h-3 w-20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  )
}
