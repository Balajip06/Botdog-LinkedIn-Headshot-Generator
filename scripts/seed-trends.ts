/**
 * Inserts a starter set of viral-trend rows into the linked Supabase project
 * using the service-role client. Bypasses RLS. Safe to re-run — slug is the
 * conflict target and existing rows are left untouched.
 *
 * Run: pnpm dlx tsx scripts/seed-trends.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { TrendInput } from '../lib/trends/input-schema'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

interface FAQ {
  question: string
  answer: string
}

interface SeedTrend {
  slug: string
  title: string
  description: string
  prompt_template: string
  model: 'nano-banana' | 'nano-banana-pro'
  aspect_ratio: '1:1' | '3:4' | '16:9' | '9:16'
  input_schema: TrendInput
  display_order: number
  seo_title: string
  seo_description: string
  faq: FAQ[]
  is_active: boolean
  eval_status: 'passed'
}

const singlePhoto: TrendInput = {
  fields: [
    {
      type: 'image',
      name: 'user_photo',
      label: 'Your photo',
      required: true,
      min_count: 1,
      max_count: 1,
      hint: 'Clear front-facing photo with even lighting works best.',
    },
  ],
}

const trends: SeedTrend[] = [
  {
    slug: 'ghibli-portrait',
    title: 'Ghibli-style portrait',
    description: 'Turn your selfie into a soft, painterly Studio Ghibli still.',
    prompt_template:
      'A Studio Ghibli style portrait of the subject in the photo, soft lighting, hand-painted background, gentle color palette, preserve facial features',
    model: 'nano-banana-pro',
    aspect_ratio: '1:1',
    input_schema: singlePhoto,
    display_order: 1,
    seo_title: 'Ghibli-style portrait generator — turn your photo into a Studio Ghibli still',
    seo_description: 'Free Ghibli-style portrait generator. Upload a photo and get a soft, painterly result in seconds.',
    faq: [
      { question: 'Is it free?', answer: 'You get 5 free generations per week. Buy credits if you need more.' },
      { question: 'Does it work on iPhone?', answer: 'Yes — all modern mobile + desktop browsers are supported.' },
      { question: 'What photos work best?', answer: 'Clear front-facing photos with even lighting work best. Group shots vary in quality.' },
    ],
    is_active: true,
    eval_status: 'passed',
  },
  {
    slug: 'pixar-3d-character',
    title: 'Pixar 3D character',
    description: 'Reimagine yourself as a Pixar-style 3D animated character.',
    prompt_template:
      'A Pixar style 3D animated character version of the subject in the photo, expressive eyes, soft shading, cinematic lighting, friendly cartoonish proportions, preserve recognizable features',
    model: 'nano-banana-pro',
    aspect_ratio: '1:1',
    input_schema: singlePhoto,
    display_order: 2,
    seo_title: 'Pixar character generator — turn yourself into a Pixar 3D animation',
    seo_description: 'Get a Pixar-style 3D character of yourself. Upload one photo and the AI does the rest.',
    faq: [
      { question: 'How long does it take?', answer: 'About 20-40 seconds per generation.' },
      { question: 'Can I use it commercially?', answer: 'Outputs are yours but stylistic likeness to Pixar IP is for personal use only.' },
    ],
    is_active: true,
    eval_status: 'passed',
  },
  {
    slug: 'anime-portrait',
    title: 'Anime-style portrait',
    description: 'Bold-line anime portrait inspired by modern shōnen art.',
    prompt_template:
      'An anime style portrait of the subject in the photo, sharp linework, vibrant cel-shaded color, dynamic hair flow, expressive eyes, modern shōnen art direction',
    model: 'nano-banana-pro',
    aspect_ratio: '3:4',
    input_schema: singlePhoto,
    display_order: 3,
    seo_title: 'Anime portrait generator — turn your photo into anime art',
    seo_description: 'Upload a photo, get an anime-style portrait in seconds. Sharp lines, vivid colors, free to try.',
    faq: [
      { question: 'Will it look like me?', answer: 'Yes — the AI preserves facial features while applying the anime style.' },
    ],
    is_active: true,
    eval_status: 'passed',
  },
  {
    slug: 'vintage-polaroid',
    title: 'Vintage Polaroid',
    description: 'Faded, sun-soaked 1970s Polaroid aesthetic with a white border.',
    prompt_template:
      'A vintage 1970s Polaroid photograph of the subject in the photo, slightly faded colors, soft film grain, warm sun-soaked tones, classic white Polaroid border, slight light leak in one corner',
    model: 'nano-banana',
    aspect_ratio: '1:1',
    input_schema: singlePhoto,
    display_order: 4,
    seo_title: 'Vintage Polaroid generator — turn any photo into a 70s Polaroid',
    seo_description: 'Faded colors, film grain, classic Polaroid white border. Upload any photo to try it.',
    faq: [
      { question: 'Does it add the Polaroid border?', answer: 'Yes — the white frame is part of the output.' },
    ],
    is_active: true,
    eval_status: 'passed',
  },
  {
    slug: 'marble-statue',
    title: 'Greek marble statue',
    description: 'You, sculpted in classical Greek marble. Dramatic lighting included.',
    prompt_template:
      'A classical Greek marble statue version of the subject in the photo, pure white marble texture, dramatic side lighting, dark museum background, slight aged patina, preserve facial features',
    model: 'nano-banana-pro',
    aspect_ratio: '3:4',
    input_schema: singlePhoto,
    display_order: 5,
    seo_title: 'Marble statue generator — turn your photo into a Greek sculpture',
    seo_description: 'Get an ultra-realistic classical Greek marble statue of yourself. Free to try.',
    faq: [
      { question: 'Does it work on full body shots?', answer: 'Yes, though headshots tend to look the most dramatic.' },
    ],
    is_active: true,
    eval_status: 'passed',
  },
]

async function main() {
  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  for (const trend of trends) {
    const { data, error } = await supabase
      .from('trends')
      .insert(trend)
      .select('id, slug')
      .maybeSingle()

    if (error) {
      if (error.message.includes('duplicate key')) {
        skipped += 1
        console.log(`  skip ${trend.slug} (already exists)`)
      } else {
        errors.push(`${trend.slug}: ${error.message}`)
        console.error(`  FAIL ${trend.slug}: ${error.message}`)
      }
      continue
    }
    inserted += 1
    console.log(`  + ${trend.slug} (${(data as { id: string }).id})`)
  }

  console.log('')
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped:  ${skipped}`)
  console.log(`Errors:   ${errors.length}`)
  if (errors.length > 0) process.exit(1)
}

void main()
