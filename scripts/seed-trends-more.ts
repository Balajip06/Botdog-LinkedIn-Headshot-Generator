/**
 * One-off: insert 10 additional viral image trends via service-role client.
 * Idempotent — uses upsert-by-slug (insert ignored on conflict).
 *
 * Researched 2026-05 from current TikTok/Instagram viral chatter +
 * Nano Banana Pro / ChatGPT image trend roundups.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

interface FAQ {
  question: string
  answer: string
}

interface NewTrend {
  slug: string
  title: string
  description: string
  prompt_template: string
  model: 'nano-banana' | 'nano-banana-pro'
  aspect_ratio: '1:1' | '3:4' | '16:9' | '9:16'
  display_order: number
  seo_title: string
  seo_description: string
  faq: FAQ[]
}

const DEFAULT_SCHEMA = {
  fields: [
    {
      type: 'image' as const,
      name: 'user_photo',
      label: 'Your photo',
      required: true,
      min_count: 1,
      max_count: 1,
      hint: 'Clear front-facing photo works best.',
    },
  ],
}

const trends: NewTrend[] = [
  {
    slug: 'stranger-things-poster',
    title: 'Stranger Things 80s poster',
    description: 'Cinematic Netflix-style poster — neon red & teal, fog, retro grain, Upside Down vibes.',
    prompt_template:
      'Cinematic Stranger Things style poster of the subject in the photo. Dark 1980s small-town atmosphere, neon red and teal rim lighting, fog rolling at ground level, lens flares, 35mm film grain, VHS scan lines, retro serif title-card mood, supernatural tension, faces preserved exactly. Avoid text or logos.',
    model: 'nano-banana-pro',
    aspect_ratio: '3:4',
    display_order: 10,
    seo_title: 'Stranger Things poster generator — turn your photo into an 80s Netflix scene',
    seo_description:
      'Free Stranger Things AI poster generator. Upload a photo and get a cinematic Upside Down style portrait in seconds.',
    faq: [
      {
        question: 'Does it preserve my face?',
        answer:
          'Yes — the prompt instructs the model to keep facial features unchanged while restyling lighting, color, and atmosphere.',
      },
      {
        question: 'Why 3:4 aspect?',
        answer: 'Matches classic VHS / movie-poster framing and works well as an Instagram story or print.',
      },
      {
        question: 'What photo works best?',
        answer: 'A clear front-facing photo with the subject occupying most of the frame. Strong original lighting helps.',
      },
    ],
  },
  {
    slug: 'action-figure-box',
    title: 'Action figure in box',
    description: 'You as a collectible toy, packaged in a branded blister card — Barbie / Star Wars / Funko vibes.',
    prompt_template:
      'A high-detail product photograph of a collectible action figure based on the subject in the photo, sealed inside a glossy plastic blister pack mounted to a colorful retail cardback. Show the figure standing inside the bubble with accessories beside it (laptop, coffee cup, headphones). Realistic plastic skin texture, bright store-shelf lighting, slight reflections on the plastic dome. Faces preserved exactly.',
    model: 'nano-banana-pro',
    aspect_ratio: '3:4',
    display_order: 11,
    seo_title: 'AI action figure generator — turn your photo into a boxed collectible',
    seo_description:
      'The viral "Barbie box" trend in one click. Upload a photo and get yourself as a packaged action figure with accessories.',
    faq: [
      {
        question: 'Can I change the accessories?',
        answer:
          'V1 ships fixed accessories (laptop, coffee, headphones). Custom accessories arrive in a later release.',
      },
      {
        question: 'Is the cardback design random?',
        answer: 'Yes — the model picks the color and style each run. Generate a few to find one you like.',
      },
    ],
  },
  {
    slug: 'funko-pop-figure',
    title: 'Funko Pop figure',
    description: 'You as the chunky-headed, dot-eyed vinyl collectible — clean studio backdrop.',
    prompt_template:
      'A photorealistic Funko Pop vinyl figure version of the subject in the photo. Oversized cube head, simple matte plastic body, characteristic black dot eyes, no mouth, soft studio backdrop with gentle shadow underneath. Keep the subject\'s hairstyle, clothing color palette, and recognizable accessories so the figure is identifiable.',
    model: 'nano-banana-pro',
    aspect_ratio: '1:1',
    display_order: 12,
    seo_title: 'Funko Pop generator — turn your photo into a vinyl figure',
    seo_description: 'Free AI tool that turns any photo into a Funko Pop style collectible figure with dot eyes.',
    faq: [
      {
        question: 'Does it keep my hairstyle?',
        answer: 'The prompt instructs the model to preserve hairstyle + clothing palette so the Pop is recognizable as you.',
      },
      {
        question: 'Can I put it in a box?',
        answer: 'Use the "Action figure in box" trend instead — it ships the figure already packaged.',
      },
    ],
  },
  {
    slug: 'lego-minifigure',
    title: 'LEGO minifigure',
    description: 'You as a smooth yellow LEGO minifigure with printed face + accessories.',
    prompt_template:
      'A LEGO minifigure version of the subject in the photo. Smooth glossy yellow plastic head with a printed face matching the subject\'s expression, classic block body with printed torso reflecting clothing colors, plastic hair piece in the subject\'s hairstyle, optional simple accessory in hand. Clean studio backdrop, soft shadow, slight specular highlights on plastic.',
    model: 'nano-banana-pro',
    aspect_ratio: '1:1',
    display_order: 13,
    seo_title: 'LEGO minifigure generator — turn your photo into a brick toy',
    seo_description: 'Upload a photo and get yourself as an official-looking LEGO minifigure with printed face and accessories.',
    faq: [
      {
        question: 'Why yellow skin?',
        answer: "Classic LEGO minifigures use the iconic yellow face. Custom skin tones arrive in a later release.",
      },
    ],
  },
  {
    slug: 'wes-anderson-pastel',
    title: 'Wes Anderson pastel',
    description: 'Centered symmetrical composition, pastel palette, dollhouse lighting — Grand Budapest aesthetic.',
    prompt_template:
      'A Wes Anderson style cinematic portrait of the subject in the photo. Perfectly centered symmetrical composition, dollhouse-like flat backdrop, soft pastel palette (mint, salmon, mustard, dusty pink), even diffuse lighting, deadpan expression preserved exactly, slight film grain, 4:3 movie aspect feel within a 16:9 frame, props arranged with obsessive symmetry.',
    model: 'nano-banana-pro',
    aspect_ratio: '16:9',
    display_order: 14,
    seo_title: 'Wes Anderson AI portrait — pastel symmetrical photo generator',
    seo_description: 'Free generator that turns your photo into a Wes Anderson style symmetrical pastel portrait.',
    faq: [
      {
        question: 'Why 16:9?',
        answer: "Matches Wes Anderson's anamorphic cinematic framing and reads as a film still on social.",
      },
    ],
  },
  {
    slug: 'renaissance-oil-painting',
    title: 'Renaissance oil painting',
    description: 'You as a 16th-century noble — chiaroscuro lighting, brushwork, gold-leaf frame.',
    prompt_template:
      'A Renaissance-era oil painting portrait of the subject in the photo. Dark moody background, dramatic chiaroscuro lighting from a single window-light source, period clothing (high collar, brocade, pearl earring or chain), visible oil brushwork, slight craquelure texture across the painting, ornate gold leaf frame implied around edges. Faces preserved exactly, dignified expression.',
    model: 'nano-banana-pro',
    aspect_ratio: '3:4',
    display_order: 15,
    seo_title: 'Renaissance oil painting AI — turn your photo into a 16th-century portrait',
    seo_description: 'Upload a selfie and get an oil-painted Renaissance noble portrait with chiaroscuro lighting.',
    faq: [
      {
        question: 'Can I pick the era?',
        answer: 'V1 uses High Renaissance (~1500s). Baroque, Rococo, and Romantic eras land in a future release.',
      },
    ],
  },
  {
    slug: 'south-park-cartoon',
    title: 'South Park character',
    description: 'You as a paper-cutout South Park kid — round head, beady eyes, mountain backdrop.',
    prompt_template:
      'A South Park style cartoon version of the subject in the photo. Round flat head, small beady black eyes with white pupils, simple stick limbs, large knit winter cap or beanie, basic primary-color clothing, flat construction-paper texture, simple mountain-town backdrop with pine trees and snow. Faces simplified to characteristic South Park style.',
    model: 'nano-banana',
    aspect_ratio: '1:1',
    display_order: 16,
    seo_title: 'South Park AI generator — turn your photo into a Colorado cartoon',
    seo_description: 'Free AI tool that turns any photo into a South Park style paper-cutout cartoon.',
    faq: [
      {
        question: 'Why the quick model?',
        answer: "South Park's flat low-detail style doesn't need the Pro model — Quick generates faster and saves credits.",
      },
    ],
  },
  {
    slug: 'cyberpunk-neon',
    title: 'Cyberpunk neon portrait',
    description: 'You as a Night City netrunner — chrome implants, rain-slick neon streets, holographic ads.',
    prompt_template:
      'A cyberpunk neon-noir portrait of the subject in the photo. Chrome cybernetic implants subtly placed (jaw plate, neck port, temple chip), rain-slick city street background with vivid neon signage in pink and cyan, holographic billboards reflecting off wet pavement, slight CRT scanline overlay, futuristic streetwear with reflective panels. Faces preserved exactly, intense piercing gaze.',
    model: 'nano-banana-pro',
    aspect_ratio: '3:4',
    display_order: 17,
    seo_title: 'Cyberpunk portrait generator — Night City neon photo AI',
    seo_description: 'Turn your selfie into a cyberpunk netrunner portrait with chrome implants and neon streets.',
    faq: [
      {
        question: 'How prominent are the implants?',
        answer: 'Subtle by default — small chrome plates and a temple chip. Generate again for a different variation.',
      },
    ],
  },
  {
    slug: 'y2k-digicam-flash',
    title: 'Y2K digicam flash',
    description: '2006 nightlife aesthetic — harsh on-camera flash, glowy skin, low-res digicam grain.',
    prompt_template:
      'A late-2000s digital camera flash photo of the subject in the photo. Harsh direct on-camera flash, slightly overexposed faces, deep dark backgrounds (party/bar/bedroom), low-resolution digicam noise, mild chromatic aberration, slight motion blur, candid imperfect framing, Y2K nightlife mood. Subjects look casual and unposed.',
    model: 'nano-banana',
    aspect_ratio: '1:1',
    display_order: 18,
    seo_title: 'Y2K digicam flash AI — 2000s nightlife photo generator',
    seo_description: 'Recreate the viral 2000s digital camera flash aesthetic — harsh flash, glowy skin, faded grain.',
    faq: [
      {
        question: 'Does it work on group photos?',
        answer: 'Yes — multi-person photos read as classic 2000s party shots. Faces stay recognizable.',
      },
    ],
  },
  {
    slug: 'linkedin-headshot',
    title: 'LinkedIn headshot',
    description: 'Professional studio headshot from any selfie — soft key light, neutral backdrop, business attire.',
    prompt_template:
      'A professional LinkedIn-style studio headshot of the subject in the photo. Soft three-point lighting with a warm key light, neutral gray or muted blue gradient backdrop, sharp focus on the eyes, slight smile, business attire (blazer or smart shirt) replacing original clothing, subtle skin retouching but preserving natural texture, shallow depth of field with creamy background blur. Faces preserved exactly.',
    model: 'nano-banana-pro',
    aspect_ratio: '1:1',
    display_order: 19,
    seo_title: 'LinkedIn headshot generator — professional photo from any selfie',
    seo_description: 'Upload a casual selfie and get a polished LinkedIn-ready professional headshot with studio lighting.',
    faq: [
      {
        question: 'Will it look fake?',
        answer:
          'The prompt asks for natural skin texture and authentic studio lighting. Most outputs pass for real headshots.',
      },
      {
        question: 'Can I keep my own outfit?',
        answer: 'V1 swaps to business attire. Outfit-preserving mode is on the roadmap.',
      },
    ],
  },
]

async function main() {
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const trend of trends) {
    const row = {
      ...trend,
      input_schema: DEFAULT_SCHEMA,
      is_active: true,
      eval_status: 'passed',
    }
    const { data, error } = await supabase
      .from('trends')
      .insert(row)
      .select('id, slug')
      .maybeSingle()

    if (error) {
      if (error.code === '23505' || error.message.includes('duplicate')) {
        console.log(`  = ${trend.slug} (already exists)`)
        skipped++
      } else {
        console.error(`  ✗ ${trend.slug}: ${error.message}`)
        errors++
      }
      continue
    }
    if (data) {
      console.log(`  + ${data.slug} (${data.id})`)
      inserted++
    }
  }

  console.log('')
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped:  ${skipped}`)
  console.log(`Errors:   ${errors}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
