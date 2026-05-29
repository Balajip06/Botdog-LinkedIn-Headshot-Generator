import { Clock, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GradientButton } from '@/components/brand/GradientButton'
import { Badge } from '@/components/ui/badge'
import { findMockAnonymousGeneration } from '@/lib/dev/mock-anonymous'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your free try — Trendly',
  description: 'A one-off generation from the no-signup trial flow.',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ id: string }>
}

function hoursLeft(expiresAtIso: string): number {
  const ms = new Date(expiresAtIso).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / 3_600_000)
}

export default async function AnonymousResultPage({ params }: PageProps) {
  const { id } = await params
  const gen = findMockAnonymousGeneration(id)
  if (!gen) notFound()

  const remaining = hoursLeft(gen.expires_at)

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-spotlight opacity-25 blur-3xl"
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 pt-10 pb-20">
        <header className="flex flex-col gap-2">
          <Badge
            variant="outline"
            className="w-fit rounded-full border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
          >
            <Clock className="size-3" /> Free trial · expires in {remaining}h
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Your <span className="text-gradient-hero">{gen.trend_title}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            One-off generation from the no-signup trial. Anything you don&apos;t save in the next {remaining} hours gets purged.
          </p>
        </header>

        <figure className="relative aspect-square overflow-hidden rounded-3xl border border-border/60 shadow-pop">
          <Image
            src={gen.output_image_url}
            alt={`Generated ${gen.trend_title}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
          />
        </figure>

        <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[var(--brand-grad-1)]" />
            <h2 className="text-xl font-extrabold tracking-tight">Save it forever</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up to keep this result, share without watermark, and unlock 5 free generations per week.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <GradientButton size="lg" asChild>
              <Link href={`/login?next=/anonymous/${gen.id}`}>Sign up to save</Link>
            </GradientButton>
            <Link
              href={`/trend/${gen.trend_slug}`}
              className="rounded-full border border-border px-5 py-3 text-sm font-medium hover:bg-muted"
            >
              Try another trend
            </Link>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Want to try a different photo? You get one free trial per device. Sign up for more.
        </p>
      </main>
    </div>
  )
}
