'use client'

import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Segment-level error boundary. Renders inside the root layout (preserving
 * theme + nav chrome), unlike `global-error.tsx` which only catches root-layout
 * failures. Sentry's Next.js SDK wires the report automatically.
 */
export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
        Unexpected error
      </p>
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        We logged the error and are looking into it. Try the action again, or head back home.
      </p>
      {error.digest && (
        <p className="text-muted-foreground/80 font-mono text-xs">ref: {error.digest}</p>
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="bg-foreground text-background inline-flex h-10 items-center rounded-md px-4 text-sm font-medium transition-colors hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border-border bg-background text-foreground hover:bg-muted inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium transition-colors"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
