/**
 * Phase 0 identity-preservation spike for OpenAI gpt-image-2 (THROWAWAY — not
 * shipped, not imported).
 *
 * Mirror of scripts/headshot-spike.ts but against OpenAI. Proves whether
 * gpt-image-2 preserves a person's face/identity from an uploaded photo BEFORE
 * we wire it in as a selectable production model. Uses the images/edits
 * endpoint (image + prompt -> image) — the only OpenAI path that takes the
 * user's photo as the identity anchor. Same BASE_PROMPT + STYLES as the Gemini
 * spike so spike-out-openai/ is directly comparable to spike-out/.
 *
 * Usage:
 *   1. Put the SAME 3-5 reference selfies used for the Gemini spike in spike-in/
 *   2. Set OPENAI_API_KEY in .env.local
 *   3. pnpm dlx tsx scripts/headshot-spike-openai.ts
 *   Outputs -> spike-out-openai/<face>__<style>.png  (review each against its input)
 *
 * Cost: (faces × styles) gpt-image-2 calls at ~$0.04/image (1024×1024 standard).
 * Default 4 styles — keep the face count small. Override quality with
 * SPIKE_QUALITY=high (pricier, sharper), model with SPIKE_MODEL=gpt-image-1.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

// Minimal .env.local loader (no dotenv dependency — keeps the spike self-contained).
function loadEnv(file: string): void {
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
      if (!m || process.env[m[1]] !== undefined) continue
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      process.env[m[1]] = v
    }
  } catch {
    /* no .env.local — rely on real process env */
  }
}
loadEnv('.env.local')

const API_KEY = process.env.OPENAI_API_KEY
if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env.local — cannot run a real identity test.')
  process.exit(1)
}

const MODEL = process.env.SPIKE_MODEL ?? 'gpt-image-2'
const QUALITY = process.env.SPIKE_QUALITY ?? 'medium' // low | medium | high (gpt-image quality tiers)
const SIZE = '1024x1024' // 1:1 — matches the headshot trend aspect ratio
const ONLY = process.env.SPIKE_ONLY // optional substring filter on input filename
const EDITS_URL = 'https://api.openai.com/v1/images/edits'
const IN_DIR = 'spike-in'
const OUT_DIR = 'spike-out-openai'

// Exact Phase-B base prompt — identical to scripts/headshot-spike.ts so outputs
// are directly comparable. {{style}} is the only substitution.
const BASE_PROMPT =
  'A photorealistic professional LinkedIn headshot of the same person as in the uploaded reference photo. ' +
  'Preserve their exact face, bone structure, age, ethnicity, skin tone, hairstyle and hair color as the identity ' +
  'anchor — do not beautify, slim, or alter their features. {{style}} Head-and-shoulders composition, the subject ' +
  'slightly off-center on the rule of thirds, a confident approachable expression with a subtle natural smile and ' +
  'direct eye contact, clear catchlights in the eyes. Shot on a full-frame camera with an 85mm lens at f/2.8 — sharp ' +
  'focus on the eyes with a naturally blurred environmental background. Retain natural skin texture with visible pores ' +
  'and real detail; tasteful professional retouching only, never plastic or airbrushed. Flattering, even professional ' +
  'lighting and true-to-life color, high detail, 1:1 square crop. Clean professional photograph with no text, no logos, ' +
  'and no watermarks.'

// Same representative 4 of the 14 styles as the Gemini spike.
const STYLES: Record<string, string> = {
  corporate:
    'The subject wears a tailored navy blazer over a crisp white shirt, photographed in a bright modern glass-walled ' +
    'office with softly blurred desks and large daylight windows behind them; clean, trustworthy, balanced lighting.',
  healthcare:
    'The subject wears a crisp white medical coat over a collared shirt, photographed in a bright contemporary clinic ' +
    'with softly blurred glass partitions and clean fixtures; calm, warm, trustworthy lighting.',
  creative:
    'The subject wears a stylish layered outfit with an interesting texture or accent color, photographed in a warm ' +
    'design studio with blurred shelves of materials, artwork and plants; soft warm editorial lighting, imaginative mood.',
  adventure:
    'The subject wears a technical outdoor jacket or fleece, photographed against a scenic natural landscape with softly ' +
    'blurred mountains and trees; warm golden-hour light, authentic adventurous mood.',
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string }>
  error?: { message?: string; code?: string; type?: string }
}

async function generate(
  prompt: string,
  imgBytes: Uint8Array,
  mime: string,
  filename: string
): Promise<Uint8Array> {
  // Copy into a concrete ArrayBuffer — Node's Buffer is typed as
  // Uint8Array<ArrayBufferLike>, which BlobPart rejects (SharedArrayBuffer union).
  const ab = imgBytes.buffer.slice(
    imgBytes.byteOffset,
    imgBytes.byteOffset + imgBytes.byteLength
  ) as ArrayBuffer

  const form = new FormData()
  form.append('model', MODEL)
  form.append('prompt', prompt)
  form.append('size', SIZE)
  form.append('quality', QUALITY)
  form.append('n', '1')
  form.append('image', new Blob([ab], { type: mime }), filename)

  const res = await fetch(EDITS_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(180_000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`)
  }
  const json = (await res.json()) as OpenAIImageResponse
  if (json.error) throw new Error(`OpenAI error: ${json.error.message ?? json.error.code}`)
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('No image in response')
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true })

  let files: string[]
  try {
    files = (await readdir(IN_DIR)).filter(
      (f) => MIME[extname(f).toLowerCase()] && (!ONLY || f.includes(ONLY))
    )
  } catch {
    console.error(`No ${IN_DIR}/ folder. Create it and add 3-5 reference selfies (jpg/png/webp).`)
    process.exit(1)
  }
  if (files.length === 0) {
    console.error(`No images in ${IN_DIR}/. Add 3-5 reference selfies (jpg/png/webp).`)
    process.exit(1)
  }

  const styleKeys = Object.keys(STYLES)
  console.log(`Model: ${MODEL} (quality=${QUALITY}, size=${SIZE})`)
  console.log(
    `Faces: ${files.length} × Styles: ${styleKeys.length} = ${files.length * styleKeys.length} calls\n`
  )

  let ok = 0
  let fail = 0
  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const bytes = new Uint8Array(await readFile(join(IN_DIR, file)))
    const face = basename(file, ext)
    for (const key of styleKeys) {
      const prompt = BASE_PROMPT.replace('{{style}}', STYLES[key])
      const label = `${face} -> ${key}`
      const t0 = Date.now()
      try {
        const png = await generate(prompt, bytes, MIME[ext], file)
        const out = join(OUT_DIR, `${face}__${key}.png`)
        await writeFile(out, png)
        console.log(
          `  ok ${label}  (${((Date.now() - t0) / 1000).toFixed(1)}s, ${(png.length / 1024).toFixed(0)}KB) -> ${out}`
        )
        ok++
      } catch (err) {
        console.error(`  FAIL ${label}: ${err instanceof Error ? err.message : String(err)}`)
        fail++
      }
    }
  }

  console.log(
    `\nDone. ok=${ok} fail=${fail}. Review ${OUT_DIR}/ against ${IN_DIR}/ for identity fidelity, ` +
      `then compare side-by-side with spike-out/ (Gemini).`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
