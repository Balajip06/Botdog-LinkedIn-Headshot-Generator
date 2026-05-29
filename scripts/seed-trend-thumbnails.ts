/**
 * Backfill placeholder thumbnails on every active trend row in the linked
 * Supabase project. Each slug maps deterministically to one of the 5
 * brand-gradient SVGs under public/mock/ — same pattern as
 * lib/dev/mock-data.ts so MOCK and live look identical until real eval
 * outputs land.
 *
 * Safe to re-run: UPDATEs are idempotent for the same slug.
 *
 * Run: pnpm dlx tsx scripts/seed-trend-thumbnails.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

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

const THUMBS = [
  '/mock/sample-1.svg',
  '/mock/sample-2.svg',
  '/mock/sample-3.svg',
  '/mock/sample-4.svg',
  '/mock/sample-5.svg',
] as const

function djb2(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return Math.abs(hash)
}

function pickThumb(slug: string): string {
  return THUMBS[djb2(slug) % THUMBS.length]
}

interface TrendRow {
  id: string
  slug: string
  thumbnail_url: string | null
  sample_after_url: string | null
}

async function main() {
  const { data: rawRows, error: listErr } = await supabase
    .from('trends')
    .select('id, slug, thumbnail_url, sample_after_url')
  if (listErr) {
    console.error('Failed to list trends:', listErr.message)
    process.exit(1)
  }
  const rows = (rawRows as unknown as TrendRow[] | null) ?? []
  if (rows.length === 0) {
    console.log('No trends found — run seed-trends.ts first.')
    return
  }

  let updated = 0
  let skipped = 0
  for (const row of rows) {
    const thumb = pickThumb(row.slug)
    if (row.thumbnail_url === thumb && row.sample_after_url === thumb) {
      skipped += 1
      console.log(`  = ${row.slug} already pointing at ${thumb}`)
      continue
    }
    const { error } = await supabase
      .from('trends')
      .update({ thumbnail_url: thumb, sample_after_url: thumb })
      .eq('id', row.id)
    if (error) {
      console.error(`  FAIL ${row.slug}: ${error.message}`)
      continue
    }
    updated += 1
    console.log(`  + ${row.slug} -> ${thumb}`)
  }

  console.log('')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
}

void main()
