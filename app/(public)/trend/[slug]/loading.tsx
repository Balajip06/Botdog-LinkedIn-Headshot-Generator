import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div aria-hidden="true" className="relative">
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-10 pb-24">
        {/* Breadcrumb */}
        <Skeleton className="h-7 w-32 rounded-full" />

        {/* Hero — sample + intro */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-4/5" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
        </section>

        {/* Upload + FAQ */}
        <section className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="border-border/60 bg-card shadow-soft rounded-3xl border p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-1.5">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="mt-4 h-11 w-40 rounded-full" />
          </div>

          <aside className="border-border/60 bg-card/80 rounded-3xl border p-6 backdrop-blur sm:p-8">
            <Skeleton className="h-7 w-32" />
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-border/40 flex flex-col gap-2 border-b pb-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
