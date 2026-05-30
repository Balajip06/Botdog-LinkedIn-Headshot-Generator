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

// Matches the seed trend in lib/dev/mock-data.ts. Keep this in sync if the
// canonical Ghibli trend ever gets renamed in the live seed.
const GHIBLI_TREND_SLUG = 'ghibli-portrait'

const CANONICAL_PATH = '/free-ghibli-effect-maker'
const PAGE_TITLE = 'Free Ghibli-Style Effect Maker — Trendly'
const PAGE_DESCRIPTION =
  'Turn your photos into hand-drawn Studio Ghibli–style art in 30 seconds. Free first try, no signup. Soft palette, dreamy lighting, real animation aesthetic.'

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
    title: 'Upload your photo',
    body: 'Drop a clear selfie, landscape, or pet photo. JPEG, PNG, or HEIC — all work.',
  },
  {
    icon: Wand2,
    title: 'Pick the Ghibli style',
    body: 'Soft palette, hand-drawn lines, dreamy lighting. The prompt is hand-tuned for you.',
  },
  {
    icon: Download,
    title: 'Download in 30s',
    body: 'Server-side render finishes in ~30 seconds. Save the result or share straight to your story.',
  },
]

interface Differentiator {
  title: string
  body: string
}

const DIFFERENTIATORS: Differentiator[] = [
  {
    title: 'Free first try, no signup',
    body: 'Most tools force a credit card before you see a single output. We don’t. Try one for free, then decide.',
  },
  {
    title: 'Real Studio Ghibli aesthetic',
    body: 'Soft watercolor palette, hand-drawn linework, dreamy backlight — not the muddy "anime-ish" filter you get from generic models.',
  },
  {
    title: 'Works on any photo',
    body: 'Portraits, landscapes, pets, group shots. The prompt adapts — you don’t need to crop or stage your photo.',
  },
  {
    title: 'Save your generation forever',
    body: 'Create a free account and your Ghibli portraits stay in your history. No purge after 30 days like the free tier alone.',
  },
]

interface CompareRow {
  label: string
  trendly: string
  midjourney: string
  photoshop: string
}

const COMPARE_ROWS: CompareRow[] = [
  {
    label: 'Price',
    trendly: 'Free first try / $4.99 pack',
    midjourney: '$10/month',
    photoshop: '$22/month',
  },
  {
    label: 'Time per image',
    trendly: '30s',
    midjourney: '1–2 min',
    photoshop: '3–5 min',
  },
  {
    label: 'Signup',
    trendly: 'Optional',
    midjourney: 'Required',
    photoshop: 'Required + Adobe subscription',
  },
]

const FAQ: Array<{ question: string; answer: string }> = [
  {
    question: 'Is this really free?',
    answer:
      'Yes. Your first generation is free with no signup. A free account gets you five generations per week, forever. If you want more, credit packs start at $4.99 and the credits never expire.',
  },
  {
    question: 'How is this different from Midjourney?',
    answer:
      'Midjourney is a general-purpose image generator that requires writing your own prompt. Our Ghibli maker uses a hand-tuned prompt built for one job — taking your photo and turning it into a Studio Ghibli–style image. No prompt engineering required.',
  },
  {
    question: 'Can I use it commercially?',
    answer:
      'The outputs are yours to use commercially, with the carve-out that the Studio Ghibli aesthetic is a style reference — the visual style is inspired by, not affiliated with, Studio Ghibli. Read our Terms of Service for the full details.',
  },
  {
    question: 'What happens to my photo?',
    answer:
      'Your source photo is stored only as long as needed to generate your image. We never train any AI model on your uploads, and you can delete your account and all data at any time.',
  },
]

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

// Related trends for cross-link juice — slugs match lib/dev/mock-data.ts seeds.
const RELATED_TRENDS: Array<{ slug: string; label: string }> = [
  { slug: 'pixar-3d-character', label: 'Free Pixar-style avatar maker' },
  { slug: 'anime-portrait', label: 'Free anime-style portrait maker' },
  { slug: 'renaissance-oil-painting', label: 'Free Renaissance oil painting maker' },
  { slug: 'cyberpunk-neon', label: 'Free cyberpunk neon portrait maker' },
]

export default function FreeGhibliEffectMakerPage() {
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
            Free <span className="text-gradient-hero">Ghibli-Style</span> Effect Maker
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Turn your photos into hand-drawn animation in 30 seconds. Free to try. No signup
            required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <GradientButton size="xl" asChild>
              <Link href={`/trend/${GHIBLI_TREND_SLUG}`}>Make yours free</Link>
            </GradientButton>
            <Link
              href="/"
              className="border-border hover:bg-muted rounded-full border px-6 py-3 text-sm font-medium"
            >
              See other trends →
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
          <h2 className="text-2xl font-bold tracking-tight">What&apos;s different about ours?</h2>
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
          <h2 className="text-2xl font-bold tracking-tight">
            Trendly free Ghibli maker vs paid alternatives
          </h2>
          <div className="border-border/60 bg-card overflow-x-auto rounded-3xl border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-border/60 bg-card/80 border-b text-left">
                  <th className="px-5 py-4 font-semibold"> </th>
                  <th className="px-5 py-4 font-semibold">
                    <span className="text-gradient-hero">Trendly</span>
                  </th>
                  <th className="text-muted-foreground px-5 py-4 font-semibold">Midjourney</th>
                  <th className="text-muted-foreground px-5 py-4 font-semibold">Photoshop AI</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-border/40 border-b last:border-b-0">
                    <td className="px-5 py-4 font-medium">{row.label}</td>
                    <td className="px-5 py-4 font-semibold">{row.trendly}</td>
                    <td className="text-muted-foreground px-5 py-4">{row.midjourney}</td>
                    <td className="text-muted-foreground px-5 py-4">{row.photoshop}</td>
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

        {/* Related trends */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">More free trend makers</h2>
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
            Make your Ghibli portrait now
          </h2>
          <p className="text-muted-foreground max-w-xl text-sm">
            First one&apos;s free. No card, no signup, no waitlist.
          </p>
          <GradientButton size="lg" asChild>
            <Link href={`/trend/${GHIBLI_TREND_SLUG}`}>Make yours free →</Link>
          </GradientButton>
        </section>
      </main>
    </div>
  )
}
