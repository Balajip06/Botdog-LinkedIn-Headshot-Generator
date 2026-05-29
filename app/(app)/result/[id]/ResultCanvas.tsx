'use client'

import Image from 'next/image'
import type { Status } from './StatusBadge'

interface ResultCanvasProps {
  status: Status
  outputImageUrl: string | null
  errorMessage: string | null
  attempts: number
  title: string
}

export function ResultCanvas({
  status,
  outputImageUrl,
  errorMessage,
  attempts,
  title,
}: ResultCanvasProps) {
  if (status === 'completed' && outputImageUrl) {
    return (
      <figure className="relative aspect-square overflow-hidden rounded-3xl border border-border/60 bg-card shadow-pop animate-pop-in">
        <Image
          src={outputImageUrl}
          alt={title}
          fill
          priority
          quality={95}
          sizes="(max-width: 1024px) 100vw, 720px"
          className="object-cover"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 bg-gradient-hero opacity-50 blur-3xl"
        />
      </figure>
    )
  }
  if (status === 'failed') {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-destructive/30 bg-destructive/5 p-12 text-center">
        <p className="text-2xl font-bold text-destructive">Generation failed</p>
        {errorMessage && (
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Don&apos;t worry — your quota was refunded. Try again or pick a different trend.
        </p>
      </div>
    )
  }
  // pending, processing, failed_retryable
  const subline =
    status === 'processing'
      ? 'Rendering pixels — usually 8 seconds…'
      : status === 'failed_retryable'
        ? `Auto-retrying… attempt ${attempts}`
        : 'Queued — starting in a moment…'
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
      <div className="aspect-square w-full bg-gradient-hero opacity-25" />
      <div className="absolute inset-0 animate-shimmer" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <div className="size-12 animate-spin rounded-full border-4 border-white/60 border-t-white" />
        <p className="text-sm font-medium text-white drop-shadow-md">{subline}</p>
      </div>
    </div>
  )
}
