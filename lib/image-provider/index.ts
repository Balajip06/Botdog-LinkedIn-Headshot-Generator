/**
 * Provider-agnostic image-generation entry point.
 *
 * Replaces the direct `lib/gemini/client.ts` import path. Picks an
 * implementation at runtime based on the `IMAGE_PROVIDER` env var
 * (default `gemini`). Call sites import only from this file:
 *
 * ```ts
 * import { generateImage } from '@/lib/image-provider'
 * ```
 *
 * Adding a new provider:
 *   1. Create `lib/image-provider/<name>.ts` exporting `generateImage`
 *      with the same signature as `./gemini.ts`.
 *   2. Add `<name>` to the `ImageProvider` union in `./types.ts`.
 *   3. Add a case to the switch below.
 */

import { generateImage as geminiGenerate } from './gemini'
import { generateImage as openaiGenerate } from './openai'
import type { GenerateImageArgs, GenerateImageResult, ImageProvider } from './types'

export type {
  GenerateImageArgs,
  GenerateImageOk,
  GenerateImageFail,
  GenerateImageFailReason,
  GenerateImageResult,
  ImageModel,
  ImageProvider,
} from './types'

function resolveProvider(): ImageProvider {
  const raw = process.env.IMAGE_PROVIDER?.toLowerCase()
  if (raw === 'openai') return 'openai'
  return 'gemini'
}

export async function generateImage(args: GenerateImageArgs): Promise<GenerateImageResult> {
  const provider = resolveProvider()
  switch (provider) {
    case 'openai':
      return openaiGenerate(args)
    case 'gemini':
    default:
      return geminiGenerate(args)
  }
}
