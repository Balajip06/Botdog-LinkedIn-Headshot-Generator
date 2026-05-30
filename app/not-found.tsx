import Link from 'next/link'

export const metadata = {
  title: 'Not found · Trendly',
  robots: { index: false, follow: false },
}

/**
 * Branded 404. Triggered by `notFound()` calls anywhere in the app and by
 * unmatched routes. Renders inside the root layout chrome.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">404</p>
      <h1 className="text-3xl font-extrabold tracking-tight">
        <span className="text-gradient-hero">Lost in the trend</span>
      </h1>
      <p className="text-muted-foreground text-sm">
        We couldn&apos;t find that page. It may have been retired, moved, or never existed.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Link
          href="/"
          className="bg-foreground text-background inline-flex h-10 items-center rounded-md px-4 text-sm font-medium transition-colors hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/trend"
          className="border-border bg-background text-foreground hover:bg-muted inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium transition-colors"
        >
          Browse trends
        </Link>
      </div>
    </main>
  )
}
