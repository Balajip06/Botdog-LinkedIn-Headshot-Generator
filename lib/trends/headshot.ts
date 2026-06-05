/**
 * Single source of truth for the LinkedIn headshot trend's prompt, profession
 * styles, input schema, FAQ, and SEO. Imported by the seed script (real DB) and
 * the MOCK fixtures so they never drift.
 *
 * Adding/removing a profession = one entry in HEADSHOT_STYLES — no code change.
 * Each style `value` is the sentence interpolated into the {{style}} slot of the
 * base prompt; `label` is the UI name shown in the picker.
 *
 * Identity-fidelity note: validated on gemini-3.1-flash-image (Nano Banana 2) —
 * the base prompt anchors identity to the uploaded reference and keeps wardrobe
 * concise (detail lives in lighting/camera) per Google's image-gen guidance.
 */

import type { TrendInput } from './input-schema'

export interface HeadshotStyle {
  value: string
  label: string
  /** Stable kebab-case id for thumbnail tiles + deep-links (?style=corporate). */
  slug: string
  /** Two-stop gradient [from, to] for the placeholder tile until real art lands. */
  accent: readonly [string, string]
}

export const HEADSHOT_STYLES: readonly HeadshotStyle[] = [
  {
    label: 'Corporate',
    slug: 'corporate',
    accent: ['#0025aa', '#3b6fe0'],
    value:
      'The subject wears a tailored navy blazer over a crisp white shirt, photographed in a bright modern glass-walled office with softly blurred desks and large daylight windows behind them; clean, trustworthy, balanced lighting.',
  },
  {
    label: 'Executive',
    slug: 'executive',
    accent: ['#1f2937', '#4b5563'],
    value:
      'The subject wears a premium charcoal suit with a subtle tie, photographed in a high-floor corner office with a softly blurred city skyline through floor-to-ceiling windows; refined directional window light, authoritative mood.',
  },
  {
    label: 'Tech / Startup',
    slug: 'tech-startup',
    accent: ['#0ea5e9', '#6366f1'],
    value:
      'The subject wears a smart-casual fitted knit or open collar over a tee, photographed in a modern startup office with exposed brick, warm string lights and blurred monitors behind them; bright, energetic, optimistic lighting.',
  },
  {
    label: 'Creative',
    slug: 'creative',
    accent: ['#db2777', '#f59e0b'],
    value:
      'The subject wears a stylish layered outfit with an interesting texture or accent color, photographed in a warm design studio with blurred shelves of materials, artwork and plants; soft warm editorial lighting, imaginative mood.',
  },
  {
    label: 'Healthcare',
    slug: 'healthcare',
    accent: ['#0d9488', '#22d3ee'],
    value:
      'The subject wears a crisp white medical coat over a collared shirt, photographed in a bright contemporary clinic with softly blurred glass partitions and clean fixtures; calm, warm, trustworthy lighting.',
  },
  {
    label: 'Legal',
    slug: 'legal',
    accent: ['#1e3a5f', '#7c5e3c'],
    value:
      'The subject wears a dark navy suit with a white shirt, photographed in a warm wood-toned law library with blurred shelves of leather-bound books; dignified, sophisticated side lighting.',
  },
  {
    label: 'Real Estate',
    slug: 'real-estate',
    accent: ['#ca8a04', '#0ea5e9'],
    value:
      'The subject wears polished business-casual with a warm-neutral blazer, photographed in a bright modern open-concept home with large windows and softly blurred contemporary furniture; welcoming, optimistic daylight.',
  },
  {
    label: 'Consultant',
    slug: 'consultant',
    accent: ['#0025aa', '#64748b'],
    value:
      'The subject wears a well-fitted blazer over a collared shirt or blouse, photographed in an upscale corporate meeting space with blurred glass-and-steel accents; polished, assured, professional lighting.',
  },
  {
    label: 'Academia',
    slug: 'academia',
    accent: ['#7c3aed', '#b45309'],
    value:
      'The subject wears a smart sport coat over a collared shirt, photographed in a warm university setting with blurred bookshelves and arched windows; soft scholarly daylight, approachable and knowledgeable mood.',
  },
  {
    label: 'Culinary',
    slug: 'culinary',
    accent: ['#dc2626', '#f59e0b'],
    value:
      "The subject wears a clean chef's white jacket, photographed in a warm modern professional kitchen with softly blurred stainless steel and ambient light; passionate, inviting, warm lighting.",
  },
  {
    label: 'Wellness',
    slug: 'wellness',
    accent: ['#16a34a', '#86efac'],
    value:
      'The subject wears modern fitted activewear, photographed in a bright airy wellness studio with blurred plants, mats and large windows; energetic, healthy, uplifting natural light.',
  },
  {
    label: 'Adventure',
    slug: 'adventure',
    accent: ['#15803d', '#ca8a04'],
    value:
      'The subject wears a technical outdoor jacket or fleece, photographed against a scenic natural landscape with softly blurred mountains and trees; warm golden-hour light, authentic adventurous mood.',
  },
  {
    label: 'Digital Nomad',
    slug: 'digital-nomad',
    accent: ['#0891b2', '#f59e0b'],
    value:
      'The subject wears relaxed smart-casual (a linen shirt or light sweater), photographed in a cozy specialty cafe or co-working space with warm string lights, blurred plants and a coffee cup; warm ambient light, worldly mood.',
  },
  {
    label: 'Plant Parent',
    slug: 'plant-parent',
    accent: ['#4d7c0f', '#a3e635'],
    value:
      'The subject wears eco-conscious smart-casual in muted earth tones, photographed in a light-filled space surrounded by softly blurred lush greenery and large windows; calm, natural, nurturing diffused light.',
  },
] as const

/** Default style applied when the picker is untouched (also used at eval time). */
export const HEADSHOT_DEFAULT_STYLE = HEADSHOT_STYLES[0].value

/** Resolve a style by its kebab-case slug (thumbnail tiles + ?style= deep-links). */
export function findHeadshotStyleBySlug(slug: string): HeadshotStyle | undefined {
  return HEADSHOT_STYLES.find((s) => s.slug === slug)
}

/**
 * Funnel numbers — single source so copy never drifts from the quota trigger.
 * First headshot is free with no signup (1 anonymous trial); signing in grants
 * a starter pack of credits and a weekly free refill thereafter.
 */
export const HEADSHOT_FUNNEL = {
  freeAnonymous: 1,
  signupGrant: 5,
  freeWeekly: 5,
} as const

/**
 * Constant base prompt. {{style}} is the only substitution — it carries the
 * wardrobe + lifestyle background + light/mood from the selected profession.
 */
export const HEADSHOT_PROMPT_TEMPLATE =
  'A photorealistic professional LinkedIn headshot of the same person as in the uploaded reference photo. ' +
  'Preserve their exact face, bone structure, age, ethnicity, skin tone, hairstyle and hair color as the identity ' +
  'anchor — do not beautify, slim, or alter their features. {{style}} Head-and-shoulders composition, the subject ' +
  'slightly off-center on the rule of thirds, a confident approachable expression with a subtle natural smile and ' +
  'direct eye contact, clear catchlights in the eyes. Shot on a full-frame camera with an 85mm lens at f/2.8 — sharp ' +
  'focus on the eyes with a naturally blurred environmental background. Retain natural skin texture with visible pores ' +
  'and real detail; tasteful professional retouching only, never plastic or airbrushed. Flattering, even professional ' +
  'lighting and true-to-life color, high detail, 1:1 square crop. Clean professional photograph with no text, no logos, ' +
  'and no watermarks.'

/** Image upload + profession style picker. */
export const HEADSHOT_INPUT_SCHEMA: TrendInput = {
  fields: [
    {
      type: 'image',
      name: 'user_photo',
      label: 'Your photo',
      required: true,
      min_count: 1,
      max_count: 1,
      hint: 'A clear, front-facing photo with even lighting works best. Head and shoulders.',
    },
    {
      type: 'select',
      name: 'style',
      label: 'Style',
      required: true,
      default: HEADSHOT_DEFAULT_STYLE,
      hint: 'Pick the look for your profession',
      options: HEADSHOT_STYLES.map((s) => ({ value: s.value, label: s.label })),
    },
  ],
}

export const HEADSHOT_FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'Will it still look like me?',
    answer:
      'Yes. The AI is anchored to your uploaded photo and instructed to preserve your exact face, age, ethnicity, and hair while changing only the outfit, background, and lighting. Results look like a real studio photo of you.',
  },
  {
    question: 'Is it free?',
    answer:
      'Your first headshot is free with no signup — just upload a photo and generate. Sign in with your email to claim it and unlock 5 more, plus a fresh batch of 5 free every week. Need volume? The Botdog plan tops you up.',
  },
  {
    question: 'Which style should I pick?',
    answer:
      'Choose the profession closest to your field — Corporate, Healthcare, Tech, Creative, and more. Each sets a fitting outfit and a realistic background. You can regenerate in a different style anytime.',
  },
  {
    question: 'What photo works best?',
    answer:
      'A clear, front-facing photo of just you, with even lighting and your face and shoulders visible. Avoid sunglasses, hats, heavy filters, and group shots for the most accurate result.',
  },
  {
    question: 'How long does it take?',
    answer: 'About 10–30 seconds per headshot. You can generate as many styles as your quota allows.',
  },
  {
    question: 'Is my photo private?',
    answer:
      'Your upload is processed to generate your headshot and is never shown publicly. Free results are stored for 30 days; on the Botdog plan they are kept until you delete them. You can delete your data anytime from settings.',
  },
  {
    question: 'Can I use it for more than LinkedIn?',
    answer:
      'Yes — the square, studio-quality result works for LinkedIn, company bios, email signatures, speaker profiles, and other professional uses.',
  },
] as const

export const HEADSHOT_SEO = {
  title: 'Free AI LinkedIn Headshot Generator — Botdog',
  description:
    'Turn any selfie into a professional LinkedIn headshot in seconds. Profession-specific styles, studio lighting, true-to-you results. Powered by Botdog.',
} as const
