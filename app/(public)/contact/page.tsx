import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Scale } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const dynamic = 'force-static'
export const revalidate = 86400

const SUPPORT_EMAIL = 'support@trendly.example'
const LEGAL_EMAIL = 'legal@trendly.example'

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const title = 'Contact — Trendly'
  const description =
    'Reach the Trendly team — support, refunds, login help, and DMCA / takedown contacts.'
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/contact` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/contact`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default function ContactPage() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-spotlight opacity-20 blur-3xl"
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-12 px-6 pt-16 pb-24">
        {/* Hero */}
        <section className="flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            We read{' '}
            <span className="text-gradient-hero">every message</span>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Pick the inbox that matches your reason for reaching out and we&apos;ll get back to
            you within one business day.
          </p>
        </section>

        {/* Cards */}
        <section className="grid gap-5 sm:grid-cols-2">
          <Card className="gap-4 rounded-3xl border-border/60 p-2">
            <CardHeader className="pt-2">
              <div className="mb-2 grid size-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Mail className="size-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-xl font-bold">Support</CardTitle>
              <CardDescription>
                Refunds, login issues, anything broken.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Mail className="size-4" aria-hidden="true" />
                {SUPPORT_EMAIL}
              </a>
            </CardContent>
          </Card>

          <Card className="gap-4 rounded-3xl border-border/60 p-2">
            <CardHeader className="pt-2">
              <div className="mb-2 grid size-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Scale className="size-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-xl font-bold">Legal / takedowns</CardTitle>
              <CardDescription>
                DMCA notices, trademark claims, privacy requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <a
                href={`mailto:${LEGAL_EMAIL}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Mail className="size-4" aria-hidden="true" />
                {LEGAL_EMAIL}
              </a>
            </CardContent>
          </Card>
        </section>

        {/* Footer hint */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">
          Looking for help? Most questions are answered on our{' '}
          <Link href="/pricing" className="font-medium text-foreground hover:underline">
            pricing page
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="font-medium text-foreground hover:underline">
            terms of service
          </Link>
          .
        </section>
      </main>
    </div>
  )
}
