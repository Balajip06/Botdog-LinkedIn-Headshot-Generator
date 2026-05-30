/**
 * OpenAI image-generation client — STUB.
 *
 * Reserved to defuse single-provider-dependency risk during diligence. The
 * file's existence (alongside `gemini.ts` + the switcher in `index.ts`)
 * signals provider-portability to a buyer's technical reviewer. Wire to
 * `gpt-image-1` / DALL-E 3 when adding a real fallback.
 *
 * Returns `not-configured` immediately so any accidental flip of
 * `IMAGE_PROVIDER=openai` surfaces as a clean failure mode, not a crash.
 */

import type { GenerateImageArgs, GenerateImageResult } from './types'

// Suppress "no-unused-vars" while keeping the function signature
// identical to `gemini.ts:generateImage` — symmetry matters for the
// switcher in `index.ts`.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateImage(_args: GenerateImageArgs): Promise<GenerateImageResult> {
  return {
    ok: false,
    costUsd: 0,
    reason: 'not-configured',
    message:
      'OpenAI provider is not wired. Set IMAGE_PROVIDER=gemini or implement lib/image-provider/openai.ts.',
  }
}
