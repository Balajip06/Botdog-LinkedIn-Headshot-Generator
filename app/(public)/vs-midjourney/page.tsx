import type { Metadata } from 'next'
import Link from 'next/link'
import { GradientButton } from '@/components/brand/GradientButton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { buildFAQJsonLd } from '@/lib/seo/json-ld'

export const dynamic = 'force-static'
export const revalidate = 3600

// Brightest seed trend for the headline CTA — matches lib/dev/mock-data.ts.
const PRIMARY_TREND_SLUG = 'stranger-things-poster'

const CANONICAL_PATH = '/vs-midjourney'
const PAGE_TITLE = 'Trendly vs Midjourney — Free Viral-Trend Generator'
const PAGE_DESCRIPTION =
  "If you want a viral trend image, you don't need a $10/month Discord subscription. Side-by-side comparison: price, speed, signup, output, mobile UX."

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const canonical = `${siteUrl}${CANONICAL_PATH}`
  return {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      type: 'website',
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
    },
  }
}

interface Verdict {
  heading: string
  tone: 'trendly' | 'midjourney' | 'both'
  body: string
}

const VERDICTS: Verdict[] = [
  {
    heading: 'Pick Trendly if…',
    tone: 'trendly',
    body: "You want one specific viral aesthetic — a Ghibli portrait, an action-figure box, a Stranger Things poster — and you don't want to spend an hour writing the prompt.",
  },
  {
    heading: 'Pick Midjourney if…',
    tone: 'midjourney',
    body: 'You want a general-purpose image studio, you enjoy prompt engineering, and you need 4K renders for print or portfolio work.',
  },
  {
    heading: 'Use both if…',
    tone: 'both',
    body: 'You ship social content fast (Trendly) and occasionally need a hero-quality render that takes some hand-tuning (Midjourney).',
  },
]

interface CompareRow {
  label: string
  trendly: string
  midjourney: string
}

const COMPARE_ROWS: CompareRow[] = [
  {
    label: 'Pricing',
    trendly: '$4.99 for 50 credits (one-time)',
    midjourney: '$10/month minimum',
  },
  {
    label: 'Free trial',
    trendly: '1 free generation per device — no signup',
    midjourney: 'None — credit card required up front',
  },
  {
    label: 'Trend coverage',
    trendly: '15+ hand-tuned viral trends, refreshed weekly',
    midjourney: 'Anything you can prompt — write your own',
  },
  {
    label: 'Speed per image',
    trendly: '~30 seconds',
    midjourney: '1–2 minutes (queue varies)',
  },
  {
    label: 'Signup',
    trendly: 'Optional for first try, email-only after',
    midjourney: 'Discord account required',
  },
  {
    label: 'Mobile UX',
    trendly: 'Native web app, one-tap share',
    midjourney: 'Discord on mobile — laggy, scattered chats',
  },
  {
    label: 'Output resolution',
    trendly: 'HD PNG (~2K), watermark on free tier',
    midjourney: '4K, no watermark',
  },
  {
    label: 'Best use case',
    trendly: 'Viral social posts, story-ready images',
    midjourney: 'Art portfolios, print, concept design',
  },
]

const FAQ: Array<{ question: string; answer: string }> = [
  {
    question: 'Is Trendly really free?',
    answer:
      "Yes. The first generation on every device is free, no signup needed. Make an account and you get five free generations every week, forever. Credit packs start at $4.99 if you want more — and the credits never expire, unlike Midjourney's monthly subscription.",
  },
  {
    question: "What's actually different about your output?",
    answer:
      "Trendly ships hand-tuned prompts for specific viral trends — the Ghibli look, the action-figure-in-box meme, the 80s Stranger Things poster. Each one has been iterated by a human until it works on a wide range of source photos. Midjourney can do all of these, but you'll spend half an hour writing the prompt yourself and re-rolling.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      "There's nothing to cancel. Trendly has no subscription. You buy credits when you want them — and only when you want them. If you never come back, you owe us nothing.",
  },
  {
    question: 'Can I use the images commercially?',
    answer:
      "Outputs are yours to use commercially, with two carve-outs: branded-IP styles (Ghibli, Pixar, Stranger Things, etc.) are for personal use only — see our Terms of Service §3. For commercial work, stick to generic-style trends like the Renaissance, Marble Statue, or LinkedIn Headshot.",
  },
]

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

const MORE_TRENDS: Array<{ slug: string; label: string }> = [
  { slug: 'ghibli-portrait', label: 'Studio Ghibli portrait' },
  { slug: 'action-figure-box', label: 'Action figure in a box' },
  { slug: 'linkedin-headshot', label: 'LinkedIn headshot' },
]

export default function VsMidjourneyPage() {
  const faqJsonLd = buildFAQJsonLd(FAQ)

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-gradient-spotlight opacity-30 blur-3xl"
      />

      <main className="mx-auto flex max-w-5xl flex-col gap-20 px-6 pt-16 pb-24">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Trendly <span className="text-gradient-hero">vs Midjourney</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            If you want a trend, you don&apos;t need a $10/month Discord subscription. Here&apos;s
            the comparison — pricing, speed, signup, mobile, and what each tool is actually good at.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <GradientButton size="xl" asChild>
              <Link href={`/trend/${PRIMARY_TREND_SLUG}`}>Try the trend free</Link>
            </GradientButton>
            <Link
              href="/"
              className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-muted"
            >
              See all trends →
            </Link>
          </div>
        </section>

        {/* Quick verdict */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">Quick verdict</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {VERDICTS.map((v) => (
              <li
                key={v.heading}
                className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-6"
              >
                <span
                  className={
                    v.tone === 'trendly'
                      ? 'text-sm font-semibold text-gradient-hero'
                      : v.tone === 'midjourney'
                        ? 'text-sm font-semibold text-muted-foreground'
                        : 'text-sm font-semibold text-foreground'
                  }
                >
                  {v.heading}
                </span>
                <p className="text-sm text-muted-foreground">{v.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Full compare table */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">Full comparison</h2>
          <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-card/80 text-left">
                  <th className="px-5 py-4 font-semibold"> </th>
                  <th className="px-5 py-4 font-semibold">
                    <span className="text-gradient-hero">Trendly</span>
                  </th>
                  <th className="px-5 py-4 font-semibold text-muted-foreground">Midjourney</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border/40 last:border-b-0">
                    <td className="px-5 py-4 font-medium">{row.label}</td>
                    <td className="px-5 py-4 font-semibold">{row.trendly}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.midjourney}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">Frequently asked</h2>
          <Accordion type="single" collapsible className="rounded-2xl border border-border/60 bg-card/40 px-5">
            {FAQ.map((item, idx) => (
              <AccordionItem key={item.question} value={`faq-${idx}`}>
                <AccordionTrigger className="text-base">{item.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* More trends */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">More trends to try</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {MORE_TRENDS.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/trend/${t.slug}`}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 px-5 py-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <span>{t.label}</span>
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Bottom CTA */}
        <section className="flex flex-col items-center gap-4 rounded-3xl border border-border/60 bg-gradient-spotlight/40 p-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Try a trend in 30 seconds — no Discord, no card
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            First one&apos;s free on every device. If you never come back, you owe us nothing.
          </p>
          <GradientButton size="lg" asChild>
            <Link href={`/trend/${PRIMARY_TREND_SLUG}`}>Try free →</Link>
          </GradientButton>
        </section>
      </main>
    </div>
  )
}
