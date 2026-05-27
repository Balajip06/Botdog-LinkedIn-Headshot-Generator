/**
 * Schema.org JSON-LD builders for SSR trend pages.
 * Output a single `<script type="application/ld+json">` per page.
 */

export interface HowToStep {
  name: string
  text: string
  url?: string
  image?: string
}

export interface BuildHowToArgs {
  name: string
  description: string
  image: string
  totalTimeIso?: string // ISO 8601 e.g. 'PT30S'
  url: string
  steps: HowToStep[]
}

export function buildHowToJsonLd(args: BuildHowToArgs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: args.name,
    description: args.description,
    image: args.image,
    totalTime: args.totalTimeIso ?? 'PT60S',
    url: args.url,
    step: args.steps.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
      ...(s.image ? { image: s.image } : {}),
    })),
  } as const
}

export interface FAQEntry {
  question: string
  answer: string
}

export function buildFAQJsonLd(faq: FAQEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  } as const
}
