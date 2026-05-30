import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { AtSign, Link2 } from 'lucide-react'

export const dynamic = 'force-static'
export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const title = 'About — Trendly'
  const description =
    'Why Trendly exists, how the trend image generator works, and who is behind the product.'
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/about` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/about`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

const FALLBACK_BIO =
  'Trendly is built and operated by a small independent team. We pick the trends, write the prompts, tune the models, and keep the credit price honest. Everything you see — the dynamic schema editor, the eval grid, the watermark composer, the referral guard — is hand-built so the people making the trends actually get a tool that ships in the same week the trend goes viral.'

export default function AboutPage() {
  const photoUrl = process.env.NEXT_PUBLIC_FOUNDER_PHOTO_URL
  const bio = process.env.NEXT_PUBLIC_FOUNDER_BIO ?? FALLBACK_BIO
  const twitterUrl = process.env.NEXT_PUBLIC_FOUNDER_TWITTER_URL
  const linkedinUrl = process.env.NEXT_PUBLIC_FOUNDER_LINKEDIN_URL
  const threadsUrl = process.env.NEXT_PUBLIC_FOUNDER_THREADS_URL
  const hasAnySocial = Boolean(twitterUrl || linkedinUrl || threadsUrl)

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-spotlight opacity-20 blur-3xl"
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-16 px-6 pt-16 pb-24">
        {/* Hero */}
        <section className="flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Built for the people who can&apos;t stop{' '}
            <span className="text-gradient-hero">making the trend</span>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Trendly is a tiny team obsessed with one question: what would the perfect tool look
            like for the person who saw a trend on TikTok this morning and wants to post their
            own version before lunch?
          </p>
        </section>

        {/* Two-column why / how */}
        <section className="grid gap-8 sm:grid-cols-2">
          <article className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight">Why we exist</h2>
            <p className="text-sm text-muted-foreground">
              Every week there&apos;s a new viral image trend — Ghibli portraits, Pixar avatars,
              action-figure-in-a-box — and the tooling to make your own version is either
              clunky AI playgrounds with a hundred sliders or paid prompt marketplaces gated
              behind subscriptions. We built Trendly because the moment matters: trends are hot
              for 72 hours. If a person has to read documentation, the trend is already over.
              So we hand-curate the prompt, hand-tune the model, and ship the same one-tap flow
              that you&apos;d expect from a native app.
            </p>
          </article>

          <article className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <p className="text-sm text-muted-foreground">
              We pick a viral image trend, write the prompt that nails the look, and wire it
              into Google&apos;s Nano Banana Pro model. You pick the trend, drop in your photo,
              and the generation runs server-side in about eight seconds. If the model
              hiccups, we automatically refund the credit. There&apos;s no subscription — you
              get five free generations a week, and credit packs start at $4.99 if you want
              more. The whole thing was built solo to keep the price honest.
            </p>
          </article>
        </section>

        {/* Founder */}
        <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card/60 p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">Who&apos;s behind this</h2>
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt="Trendly founder"
              width={96}
              height={96}
              className="size-24 rounded-full object-cover"
            />
          ) : null}
          <p className="text-sm text-muted-foreground">{bio}</p>
          {hasAnySocial ? (
            <div className="flex gap-3">
              {twitterUrl ? (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Founder on X"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <AtSign className="size-4" />
                </a>
              ) : null}
              {linkedinUrl ? (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Founder on LinkedIn"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Link2 className="size-4" />
                </a>
              ) : null}
              {threadsUrl ? (
                <a
                  href={threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Founder on Threads"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <AtSign className="size-4" />
                </a>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Contact */}
        <section className="flex flex-col items-start gap-3 rounded-3xl border border-border/60 bg-gradient-spotlight/20 p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">Get in touch</h2>
          <p className="text-sm text-muted-foreground">
            Bug report, trend suggestion, refund, or just want to say hi — we read everything.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Contact us →
          </Link>
        </section>
      </main>
    </div>
  )
}
