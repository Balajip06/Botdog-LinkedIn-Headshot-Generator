/**
 * Seeds the single LinkedIn headshot trend into the linked Supabase project
 * using the service-role client (bypasses RLS).
 *
 * Single-purpose Botdog build — the headshot is the only trend. Prompt, styles,
 * schema, FAQ, and SEO are imported from lib/trends/headshot.ts (shared with the
 * MOCK fixtures so they never drift).
 *
 * Run: pnpm dlx tsx scripts/seed-trends.ts
 *
 * Idempotent: slug is the conflict target. NOTE — if the row already exists with
 * an older prompt, this script SKIPS it (does not update), because UPDATEing
 * `prompt_template` trips the eval-gate trigger (sets eval_status='untested',
 * is_active=false). To roll out a new prompt to an existing row, go through the
 * admin eval flow (/admin/trends/[id]/eval) once a GEMINI_API_KEY is wired.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import {
  HEADSHOT_FAQ,
  HEADSHOT_INPUT_SCHEMA,
  HEADSHOT_PROMPT_TEMPLATE,
  HEADSHOT_SEO,
} from '../lib/trends/headshot'

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

const headshot = {
  slug: 'linkedin-headshot',
  title: 'AI LinkedIn Headshot Generator',
  description:
    'Turn any selfie into a professional, studio-quality LinkedIn headshot — your real face, a sharp outfit, and a believable workplace background.',
  prompt_template: HEADSHOT_PROMPT_TEMPLATE,
  model: 'nano-banana' as const, // → gemini-3.1-flash-image (Nano Banana 2)
  aspect_ratio: '1:1' as const,
  input_schema: HEADSHOT_INPUT_SCHEMA,
  display_order: 0,
  seo_title: HEADSHOT_SEO.title,
  seo_description: HEADSHOT_SEO.description,
  faq: HEADSHOT_FAQ.map((f) => ({ ...f })),
  is_active: true,
  eval_status: 'passed' as const,
}

async function main() {
  const { data, error } = await supabase
    .from('trends')
    .insert(headshot)
    .select('id, slug')
    .maybeSingle()

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      console.log(`= ${headshot.slug} already exists (left untouched — use admin eval to update)`)
      return
    }
    console.error(`FAIL ${headshot.slug}: ${error.message}`)
    process.exit(1)
  }
  console.log(`+ ${data?.slug} (${data?.id})`)
}

void main()
