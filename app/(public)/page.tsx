import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { GradientButton } from '@/components/brand/GradientButton'
import { TrendRunner } from '@/components/trends/TrendRunner'
import { getSocialProof } from '@/lib/analytics/social-proof'
import { buildFAQJsonLd, buildHowToJsonLd } from '@/lib/seo/json-ld'
import { createServiceClient } from '@/lib/supabase/server'
import { HEADSHOT_SEO, HEADSHOT_STYLES } from '@/lib/trends/headshot'
import { getActiveTrendBySlug } from '@/lib/trends/repository'

const HEADSHOT_SLUG = 'linkedin-headshot'

export const metadata: Metadata = {
  title: HEADSHOT_SEO.title,
  description: HEADSHOT_SEO.description,
  alternates: { canonical: '/' },
  openGraph: {
    title: HEADSHOT_SEO.title,
    description: HEADSHOT_SEO.description,
    type: 'website',
  },
}

// JSON.stringify alone does not escape '<'; replace tag bytes with unicode
// escapes so untrusted strings can't break out of the JSON-LD script tag.
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

const STEPS = [
  { name: 'Upload your photo', text: 'Add one clear, front-facing selfie. We accept JPG, PNG, and HEIC.' },
  { name: 'Pick your profession style', text: 'Choose Corporate, Healthcare, Tech, Creative, and more — each sets the right outfit and background.' },
  { name: 'AI generates your headshot', text: 'Our AI keeps your real face and renders a studio-quality professional photo in seconds.' },
  { name: 'Download & share', text: 'Save your headshot for LinkedIn, your bio, email signature, and beyond.' },
]

const BENEFITS = [
  { title: 'True to you', body: 'Anchored to your photo — your face, age, and features are preserved, not replaced.' },
  { title: 'Seconds, not weeks', body: 'No studio booking, no photographer. A polished headshot in under a minute.' },
  { title: 'Built for LinkedIn', body: 'Square, sharp, and framed head-and-shoulders — exactly how the platform wants it.' },
  { title: 'A style for your field', body: '14 profession looks, from Corporate to Healthcare to Creative, each with a fitting background.' },
  { title: 'Studio quality', body: 'Soft key light, real skin texture, natural depth of field — no plastic AI sheen.' },
  { title: 'Private by design', body: 'Your upload is only used to make your headshot, never shown publicly, and deletable anytime.' },
]

// Illustrative examples — representative of typical use, not real customer quotes.
const TESTIMONIALS = [
  { quote: 'Looked like a real studio shot. Took me two minutes between meetings.', role: 'Product Manager' },
  { quote: 'I tried the Healthcare style and finally have a profile photo that fits my field.', role: 'Registered Nurse' },
  { quote: 'Swapped my blurry selfie for this before a job hunt. Worth it.', role: 'Recent Graduate' },
]

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export default async function HomePage() {
  const trend = await getActiveTrendBySlug(HEADSHOT_SLUG)

  let shippedTotal = 0
  try {
    const proof = await getSocialProof(createServiceClient())
    shippedTotal = proof.shippedTotal
  } catch {
    shippedTotal = 0
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const faq = trend?.faq ?? []

  const howTo = buildHowToJsonLd({
    name: 'How to make an AI LinkedIn headshot',
    description: HEADSHOT_SEO.description,
    image: trend?.sample_after_url ?? `${siteUrl}/og.png`,
    url: siteUrl,
    steps: STEPS.map((s) => ({ name: s.name, text: s.text })),
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(howTo) }} />
      {faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(buildFAQJsonLd(faq)) }}
        />
      )}

      {/* ---------------- Hero + generator ---------------- */}
      <section className="relative">
        <div
          aria-hidden
          className="bg-gradient-spotlight pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] opacity-70"
        />
        <div className="mx-auto grid max-w-6xl items-start gap-12 px-6 pt-16 pb-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24">
          <div className="animate-fade-up flex flex-col gap-6">
            <span className="bg-muted text-primary w-fit rounded-full px-3 py-1 text-xs font-medium tracking-wide">
              Free AI LinkedIn Headshot Generator
            </span>
            <h1 className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              A professional headshot, <span className="text-primary">without the studio.</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
              Upload one selfie, pick your profession, and get a polished, true-to-you LinkedIn
              headshot in seconds — studio lighting and a real workplace background included.
            </p>
            <ul className="flex flex-col gap-2.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
              {['Keeps your real face', '14 profession styles', '5 free every week'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="text-success size-4 shrink-0" aria-hidden />
                  <span className="font-medium">{t}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <GradientButton size="lg" asChild>
                <a href="#create">Create your headshot</a>
              </GradientButton>
              <a
                href="#how-it-works"
                className="border-border hover:bg-muted rounded-full border px-6 py-3 text-sm font-medium transition-colors"
              >
                See how it works
              </a>
            </div>
            {shippedTotal > 100 && (
              <p className="text-muted-foreground pt-1 text-sm">
                <strong className="text-foreground font-semibold">{fmt(shippedTotal)}</strong>{' '}
                headshots generated and counting.
              </p>
            )}
          </div>

          {/* Generator card */}
          <div id="create" className="scroll-mt-24">
            <div className="border-border bg-card shadow-soft rounded-2xl border p-6 sm:p-8">
              <header className="mb-6 flex flex-col gap-1.5">
                <h2 className="text-2xl">Upload your photo</h2>
                <p className="text-muted-foreground text-sm">
                  One clear, front-facing photo. Pick a style and we’ll do the rest.
                </p>
              </header>
              {trend ? (
                <TrendRunner
                  trend={{ slug: trend.slug, input_schema: trend.input_schema, model: trend.model }}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  The generator is warming up — please check back in a moment.
                </p>
              )}
              <p className="text-muted-foreground mt-4 text-center text-xs">
                Sign in to generate · 5 free per week · your photo stays private
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="scroll-mt-24 bg-muted">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl">How it works</h2>
            <p className="text-muted-foreground mt-3 text-lg">
              A LinkedIn-ready headshot in four simple steps.
            </p>
          </div>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.name} className="border-border bg-card rounded-2xl border p-6">
                <div className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-full text-sm font-semibold">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg">{step.name}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Style showcase ---------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl">A style for every profession</h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Each style sets a fitting outfit, background, and lighting. Switch anytime.
          </p>
        </div>
        <ul className="mt-10 flex flex-wrap justify-center gap-3">
          {HEADSHOT_STYLES.map((s) => (
            <li
              key={s.label}
              className="border-border bg-card text-foreground rounded-full border px-4 py-2 text-sm font-medium"
            >
              {s.label}
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <GradientButton size="lg" asChild>
            <a href="#create">Try your style</a>
          </GradientButton>
        </div>
      </section>

      {/* ---------------- Why it matters + benefits ---------------- */}
      <section className="bg-muted">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl">Why your LinkedIn photo matters</h2>
            <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
              Your profile photo is the first impression you make on recruiters, clients, and
              collaborators. A clear, professional headshot earns more profile views and more
              replies — but a studio shoot costs time and money. This gets you there in a minute.
            </p>
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <li key={b.title} className="border-border bg-card rounded-2xl border p-6">
                <Check className="text-success size-5" aria-hidden />
                <h3 className="mt-3 text-lg">{b.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- Testimonials (illustrative) ---------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl sm:text-4xl">What people make with it</h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <li key={t.role} className="border-border bg-card rounded-2xl border p-6">
              <p className="text-lg leading-relaxed">“{t.quote}”</p>
              <p className="text-muted-foreground mt-4 text-sm font-medium">— {t.role}</p>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Illustrative examples representative of typical use.
        </p>
      </section>

      {/* ---------------- FAQ ---------------- */}
      {faq.length > 0 && (
        <section id="faq" className="scroll-mt-24 bg-muted">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <h2 className="text-center text-3xl sm:text-4xl">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-8">
              {faq.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger className="text-left text-base font-semibold">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* ---------------- Final CTA ---------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl px-8 py-14 text-center">
          <h2 className="text-primary-foreground text-3xl sm:text-4xl">
            Ready for a headshot you’ll actually use?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/85">
            Upload a selfie, pick your profession, and download your professional LinkedIn headshot
            in seconds.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="#create"
              className="text-primary rounded-full bg-white px-7 py-3 text-base font-semibold transition-colors hover:bg-white/90"
            >
              Create your headshot
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/70">5 free every week · no credit card to start</p>
        </div>
      </section>
    </>
  )
}
