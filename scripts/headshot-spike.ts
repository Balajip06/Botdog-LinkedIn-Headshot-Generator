/**
 * Phase 0 identity-preservation spike (THROWAWAY — not shipped, not imported).
 *
 * Proves whether Gemini actually preserves a person's face/identity BEFORE we
 * build the Botdog headshot product around it. Mirrors the real call path in
 * lib/image-provider/gemini.ts (same model id, request body, safety settings)
 * so the result is representative of production.
 *
 * Usage:
 *   1. Put 3-5 reference selfies (varied ethnicity / age / sex / lighting) in spike-in/
 *   2. Set GEMINI_API_KEY in .env.local
 *   3. pnpm dlx tsx scripts/headshot-spike.ts
 *   Outputs -> spike-out/<face>__<style>.png   (review each against its input)
 *
 * Cost: (faces × styles) Gemini calls. Default 4 styles — keep the face count small.
 * Override the model with SPIKE_MODEL=gemini-2.5-flash-image (nano-banana) if needed.
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

const API_KEY = process.env.GEMINI_API_KEY
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY in .env.local — cannot run a real identity test.')
  process.exit(1)
}

const MODEL = process.env.SPIKE_MODEL ?? 'gemini-3.1-flash-image' // Nano Banana 2
// Safety threshold: default mirrors production (BLOCK_MEDIUM_AND_ABOVE). SPIKE_SAFETY=low
// relaxes to BLOCK_ONLY_HIGH (fewer false refusals on benign photos); =off → BLOCK_NONE.
const SAFETY =
  process.env.SPIKE_SAFETY === 'off'
    ? 'BLOCK_NONE'
    : process.env.SPIKE_SAFETY === 'low'
      ? 'BLOCK_ONLY_HIGH'
      : 'BLOCK_MEDIUM_AND_ABOVE'
const ONLY = process.env.SPIKE_ONLY // optional substring filter on input filename
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const IN_DIR = 'spike-in'
const OUT_DIR = 'spike-out'

// Exact Phase-B base prompt. {{style}} is the only substitution.
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

// A representative 4 of the 14 styles (mainstream + lifestyle, mild + aggressive restyle).
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

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
}

async function generate(prompt: string, imgB64: string, mime: string): Promise<Uint8Array> {
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`
  const body = {
    contents: [
      { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: imgB64 } }] },
    ],
    safetySettings: [
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: SAFETY },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: SAFETY },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: SAFETY },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: SAFETY },
    ],
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = (await res.json()) as GeminiResponse
  const blocked = json.promptFeedback?.blockReason ?? json.candidates?.[0]?.finishReason
  if (blocked && blocked !== 'STOP') throw new Error(`Blocked: ${blocked}`)
  const inline = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!inline?.data) throw new Error('No image in response')
  return new Uint8Array(Buffer.from(inline.data, 'base64'))
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
  console.log(`Model: ${MODEL}`)
  console.log(
    `Faces: ${files.length} × Styles: ${styleKeys.length} = ${files.length * styleKeys.length} calls\n`
  )

  let ok = 0
  let fail = 0
  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const b64 = (await readFile(join(IN_DIR, file))).toString('base64')
    const face = basename(file, ext)
    for (const key of styleKeys) {
      const prompt = BASE_PROMPT.replace('{{style}}', STYLES[key])
      const label = `${face} -> ${key}`
      const t0 = Date.now()
      try {
        const png = await generate(prompt, b64, MIME[ext])
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

  console.log(`\nDone. ok=${ok} fail=${fail}. Review spike-out/ against spike-in/ for identity fidelity.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
