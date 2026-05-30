import type { Metadata } from 'next'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { SubmitForm } from './SubmitForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const title = 'Submit a Trend — Trendly'
  const description =
    'Spotted a viral image trend? Send it to Trendly and earn bonus credits if it ships.'
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/submit-trend` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/submit-trend`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

interface SubmitTrendPageProps {
  searchParams: Promise<{
    submitted?: string
    error?: string
  }>
}

export default async function SubmitTrendPage({ searchParams }: SubmitTrendPageProps) {
  const params = await searchParams
  const submitted = params.submitted === '1'
  const error = params.error

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-spotlight opacity-20 blur-3xl"
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 pt-16 pb-24">
        {/* Hero */}
        <section className="flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Spotted a trend?{' '}
            <span className="text-gradient-hero">Send it our way.</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            We pick ~3 new viral image trends per week. If you&apos;ve spotted one, drop the
            details — we&apos;ll evaluate it and credit you with bonus credits if it ships.
          </p>
        </section>

        {/* Flash banners */}
        {submitted && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-sm">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold text-foreground">Trend submitted</p>
              <p className="mt-1 text-muted-foreground">
                Thanks — we&apos;ll review it within the week and email you if it ships.
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Could not submit</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <SubmitForm />

        <p className="text-center text-xs text-muted-foreground">
          By submitting, you confirm the reference link is public and that you have the right
          to share it with us. We never publish your submission verbatim.
        </p>
      </main>
    </div>
  )
}
