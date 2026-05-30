import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Download, Image as ImageIcon, Wand2 } from 'lucide-react'
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

// Matches the anime portrait seed in lib/dev/mock-data.ts.
const ANIME_TREND_SLUG = 'anime-portrait'

const CANONICAL_PATH = '/free-anime-portrait-generator'
const PAGE_TITLE = 'Free Anime Portrait Generator — Trendly'
const PAGE_DESCRIPTION =
  'Turn your photo into a hand-drawn anime portrait in 30 seconds. Free first try, no signup. Clean lines, cel shading, soft skin, dramatic eyes — real anime aesthetic.'

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

interface HowStep {
  icon: typeof ImageIcon
  title: string
  body: string
}

const HOW_STEPS: HowStep[] = [
  {
    icon: ImageIcon,
    title: 'Drop in your photo',
    body: 'Selfie, group shot, or even a pet — JPEG, PNG, and HEIC all work. We compress + convert in the browser.',
  },
  {
    icon: Wand2,
    title: 'We restyle it as anime',
    body: 'Clean linework, cel shading, soft skin tones, dramatic backlit eyes. The prompt is tuned — you do nothing.',
  },
  {
    icon: Download,
    title: 'Download in ~30s',
    body: 'Save the PNG, share to your story, or pin it as a profile pic. Free tier carries a small watermark; Pro removes it.',
  },
]

interface Differentiator {
  title: string
  body: string
}

const DIFFERENTIATORS: Differentiator[] = [
  {
    title: 'Free first try — no signup',
    body: "Most anime apps gate the first result behind a paywall or a 7-day trial. We don't. One free render on every device, then decide if you want more.",
  },
  {
    title: 'Real anime aesthetic — not "anime-ish"',
    body: 'Clean lines, cel shading, soft skin shading, dramatic eyes with proper highlights. Tuned to feel like a modern shōnen still — not the muddy Snapchat-filter look.',
  },
  {
    title: 'Works on any photo type',
    body: "Front-facing selfies, side profiles, group shots, even pets. The model adapts — you don't need to crop or restage.",
  },
  {
    title: 'Save forever with a free account',
    body: 'Free tier images purge after 30 days. A free account keeps every render in your history forever. Upgrade for HD + no watermark.',
  },
]

interface CompareRow {
  label: string
  trendly: string
  picsart: string
  photoleap: string
}

const COMPARE_ROWS: CompareRow[] = [
  {
    label: 'Cost',
    trendly: 'Free first try / $4.99 pack',
    picsart: '$5/month minimum',
    photoleap: '$8/month minimum',
  },
  {
    label: 'Signup',
    trendly: 'Optional for first render',
    picsart: 'Required',
    photoleap: 'Required + Apple ID',
  },
  {
    label: 'Watermark on free',
    trendly: 'Small corner mark',
    picsart: 'Watermark + ads',
    photoleap: 'Watermark + trial timer',
  },
  {
    label: 'Web access',
    trendly: 'Browser, any device',
    picsart: 'App + limited web',
    photoleap: 'iOS app only',
  },
]

const FAQ: Array<{ question: string; answer: string }> = [
  {
    question: 'Will the output actually look like me?',
    answer:
      'Yes. The prompt is built to preserve facial structure, hair color, hair style, and rough outfit silhouette — the style transfer rides on top of those features. People who know you should recognize you instantly.',
  },
  {
    question: 'What anime style is it?',
    answer:
      "It's tuned for modern shōnen / seinen aesthetic — clean black linework, cel-shaded blocks of color, soft gradient on skin, and dramatic highlight-heavy eyes. Not chibi, not 90s-retro, not Western cartoon. If you want a specific other anime style (Ghibli, 80s OVA, etc.), we have separate trends for those.",
  },
  {
    question: 'Does it work on group photos?',
    answer:
      "Yes — multiple subjects render cleanly. The model preserves who's who and applies the style consistently across faces. Group anime portraits often go viral on TikTok and Instagram.",
  },
  {
    question: 'Can I use the image commercially?',
    answer:
      "Outputs are yours to use commercially. The anime style is a generic aesthetic — not a specific franchise — so there's no IP carve-out like there is for our Ghibli or Pixar trends. Read our Terms of Service §3 for the full breakdown.",
  },
]

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

// Anime-adjacent trends — slugs match lib/dev/mock-data.ts seeds.
const RELATED_TRENDS: Array<{ slug: string; label: string }> = [
  { slug: 'ghibli-portrait', label: 'Studio Ghibli portrait' },
  { slug: 'pixar-3d-character', label: 'Pixar 3D character' },
  { slug: 'south-park-cartoon', label: 'South Park cartoon character' },
  { slug: 'cyberpunk-neon', label: 'Cyberpunk neon portrait' },
]

export default function FreeAnimePortraitGeneratorPage() {
  const faqJsonLd = buildFAQJsonLd(FAQ)

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />

      <div
        aria-hidden
        className="bg-gradient-spotlight pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] opacity-30 blur-3xl"
      />

      <main className="mx-auto flex max-w-5xl flex-col gap-20 px-6 pt-16 pb-24">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Free <span className="text-gradient-hero">Anime Portrait</span> Generator
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Turn your photo into a hand-drawn anime portrait in 30 seconds. Free first try. No
            signup, no card, no app to download.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <GradientButton size="xl" asChild>
              <Link href={`/trend/${ANIME_TREND_SLUG}`}>Make yours free</Link>
            </GradientButton>
            <Link
              href="/"
              className="border-border hover:bg-muted rounded-full border px-6 py-3 text-sm font-medium"
            >
              Browse all trends →
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <ol className="grid gap-5 sm:grid-cols-3">
            {HOW_STEPS.map((step, idx) => {
              const Icon = step.icon
              return (
                <li
                  key={step.title}
                  className="border-border/60 bg-card flex flex-col gap-3 rounded-3xl border p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-foreground/5 text-foreground grid size-10 place-items-center rounded-2xl">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-muted-foreground text-sm font-semibold">
                      Step {idx + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.body}</p>
                </li>
              )
            })}
          </ol>
        </section>

        {/* Differentiators */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">What makes ours different?</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {DIFFERENTIATORS.map((d) => (
              <li
                key={d.title}
                className="border-border/60 bg-card/60 flex gap-3 rounded-2xl border p-5"
              >
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <Check className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{d.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{d.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Compare */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">Trendly vs other anime generators</h2>
          <div className="border-border/60 bg-card overflow-x-auto rounded-3xl border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-border/60 bg-card/80 border-b text-left">
                  <th className="px-5 py-4 font-semibold"> </th>
                  <th className="px-5 py-4 font-semibold">
                    <span className="text-gradient-hero">Trendly</span>
                  </th>
                  <th className="text-muted-foreground px-5 py-4 font-semibold">Picsart</th>
                  <th className="text-muted-foreground px-5 py-4 font-semibold">Photoleap</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-border/40 border-b last:border-b-0">
                    <td className="px-5 py-4 font-medium">{row.label}</td>
                    <td className="px-5 py-4 font-semibold">{row.trendly}</td>
                    <td className="text-muted-foreground px-5 py-4">{row.picsart}</td>
                    <td className="text-muted-foreground px-5 py-4">{row.photoleap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold tracking-tight">Frequently asked</h2>
          <Accordion
            type="single"
            collapsible
            className="border-border/60 bg-card/40 rounded-2xl border px-5"
          >
            {FAQ.map((item, idx) => (
              <AccordionItem key={item.question} value={`faq-${idx}`}>
                <AccordionTrigger className="text-base">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Related */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">More anime-style trends</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {RELATED_TRENDS.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/trend/${t.slug}`}
                  className="border-border/60 bg-card/60 hover:bg-muted flex items-center justify-between rounded-2xl border px-5 py-4 text-sm font-medium transition-colors"
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
        <section className="border-border/60 bg-gradient-spotlight/40 flex flex-col items-center gap-4 rounded-3xl border p-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Make your anime portrait now
          </h2>
          <p className="text-muted-foreground max-w-xl text-sm">
            First render is free. No card, no signup, no app. 30 seconds.
          </p>
          <GradientButton size="lg" asChild>
            <Link href={`/trend/${ANIME_TREND_SLUG}`}>Make yours free →</Link>
          </GradientButton>
        </section>
      </main>
    </div>
  )
}
