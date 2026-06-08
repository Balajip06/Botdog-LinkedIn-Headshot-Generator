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
import { StyleGrid } from '@/components/brand/StyleGrid'
import { InlineGenerator } from '@/components/generate/InlineGenerator'
import { getSocialProof } from '@/lib/analytics/social-proof'
import { MOCK_TRENDS_ENABLED } from '@/lib/dev/mock-data'
import { buildFAQJsonLd, buildHowToJsonLd } from '@/lib/seo/json-ld'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { HEADSHOT_SEO, HEADSHOT_STYLES, findHeadshotStyleBySlug } from '@/lib/trends/headshot'
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
  { name: 'Upload your photo', text: 'Add one clear, front-facing selfie. JPG, PNG, or HEIC — no account needed.' },
  { name: 'Pick your profession style', text: 'Choose Corporate, Healthcare, Tech, Creative, and more — each sets the right outfit and background.' },
  { name: 'Generate your first one free', text: 'Our AI keeps your real face and renders a studio-quality headshot in seconds — right here, no signup.' },
  { name: 'Sign in to save & get 5 more', text: 'Enter your email, click the link, and keep your headshot plus 5 free every week.' },
]

const BENEFITS = [
  { title: 'True to you', body: 'Anchored to your photo — your face, age, and features are preserved, not replaced.' },
  { title: 'Seconds, not weeks', body: 'No studio booking, no photographer. A polished headshot in under a minute.' },
  { title: 'Built for LinkedIn', body: 'Square, sharp, and framed head-and-shoulders — exactly how the platform wants it.' },
  { title: 'A style for your field', body: '36 profession styles, from Corporate to Healthcare to Creative — each with a fitting outfit and background.' },
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

interface HomePageProps {
  searchParams?: Promise<{ style?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const trend = await getActiveTrendBySlug(HEADSHOT_SLUG)

  const sp = (await searchParams) ?? {}
  const selectedStyle =
    typeof sp.style === 'string' ? findHeadshotStyleBySlug(sp.style) : undefined

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-6 pt-8 pb-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pt-12">
          <div className="animate-fade-up flex flex-col gap-6">
            <span className="bg-muted text-primary w-fit rounded-full px-3 py-1 text-xs font-medium tracking-wide">
              Your first headshot is free — no signup
            </span>
            <h1 className="text-4xl leading-[1.05] text-darktext sm:text-5xl lg:text-6xl">
              A professional headshot, <span className="text-primary">without the studio.</span>
            </h1>
            <p className="text-paragraphcolor max-w-xl text-lg leading-relaxed">
              Upload one selfie and generate a polished, true-to-you LinkedIn headshot right here —
              no account, no credit card. Like it? Sign in to save it and get 5 more, free.
            </p>
            <ul className="flex flex-col gap-2.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
              {["First one's free — no login", 'Keeps your real face', '36 profession styles'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="text-success size-4 shrink-0" aria-hidden />
                  <span className="text-paragraphcolor font-medium">{t}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <GradientButton size="lg" asChild>
                <a href="#create">Create your headshot</a>
              </GradientButton>
              <a
                href="#how-it-works"
                className="border-border text-foreground/70 hover:text-foreground hover:bg-muted rounded-full border px-6 py-3 text-sm font-medium transition-colors"
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
            <div className="border-border bg-card shadow-soft mx-auto w-full max-w-[36rem] rounded-2xl border p-6 sm:p-8">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-darktext">Upload your photo</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  One clear, front-facing photo. Your first headshot is free — no signup needed.
                </p>
              </div>
              {trend ? (
                <InlineGenerator
                  trend={{ slug: trend.slug, input_schema: trend.input_schema, model: trend.model }}
                  userId={user?.id ?? null}
                  initialStyleValue={selectedStyle?.value}
                  mock={MOCK_TRENDS_ENABLED}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  The generator is warming up — please check back in a moment.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="scroll-mt-24 bg-muted">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl text-darktext sm:text-4xl">How it works</h2>
            <p className="text-paragraphcolor mt-3 text-lg">
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
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl text-darktext sm:text-4xl">A style for every profession</h2>
          <p className="text-paragraphcolor mt-3 text-lg">
            Each style sets a fitting outfit, background, and lighting. Switch anytime.
          </p>
        </div>
        <StyleGrid styles={HEADSHOT_STYLES} />
      </section>

      {/* ---------------- Why it matters + benefits ---------------- */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl text-darktext sm:text-4xl">Why your LinkedIn photo matters</h2>
            <p className="text-paragraphcolor mt-3 text-lg leading-relaxed">
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
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center text-3xl text-darktext sm:text-4xl">What people make with it</h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <li key={t.role} className="border-border bg-card shadow-soft rounded-2xl border p-6">
                <div className="text-accent-yellow mb-3 text-base" aria-hidden="true">{'★★★★★'}</div>
                <p className="text-darktext text-lg leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-paragraphcolor mt-4 text-sm font-medium">&mdash; {t.role}</p>
              </li>
            ))}
          </ul>
          <p className="text-paragraphcolor mt-6 text-center text-xs">
            Illustrative examples representative of typical use.
          </p>
        </div>
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
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl px-8 py-14 text-center">
          <h2 className="text-primary-foreground text-3xl sm:text-4xl">
            Ready for a headshot you&rsquo;ll actually use?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/85">
            Upload a selfie, pick your profession, and download your professional LinkedIn headshot
            in seconds.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="#create"
              className="rounded-pill bg-accent-yellow px-7 py-3 text-base font-bold text-darktext shadow-button transition-colors hover:bg-accent-yellow/90"
            >
              Create your headshot
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/70">
            Your first one&rsquo;s free · no signup, no credit card
          </p>
        </div>
      </section>
    </>
  )
}
