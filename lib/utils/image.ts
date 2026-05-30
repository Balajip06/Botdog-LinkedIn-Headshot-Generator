/**
 * Client-side image preparation:
 *   1. HEIC/HEIF → JPEG via heic2any
 *   2. Resize so longest side <= MAX_DIM (controls per-call Gemini cost + bandwidth)
 *   3. Re-encode JPEG at quality 0.9
 *
 * Server callers should use sharp instead.
 */

const MAX_DIM = 2048
const QUALITY = 0.9
const HEIC_TYPES = new Set(['image/heic', 'image/heif'])

export interface PreparedImage {
  file: File
  width: number
  height: number
  bytes: number
}

export async function prepareImageForUpload(input: File): Promise<PreparedImage> {
  if (typeof window === 'undefined') {
    throw new Error('prepareImageForUpload is browser-only; use sharp on the server')
  }

  const jpeg =
    HEIC_TYPES.has(input.type) || /\.hei[cf]$/i.test(input.name)
      ? await convertHeicToJpeg(input)
      : input

  const bitmap = await createImageBitmap(jpeg)
  const { width, height } = scaleToFit(bitmap.width, bitmap.height, MAX_DIM)

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY })
  const file = new File([blob], replaceExt(input.name, 'jpg'), { type: 'image/jpeg' })

  return { file, width, height, bytes: file.size }
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: QUALITY })
  const blob = Array.isArray(out) ? out[0] : out
  return new File([blob], replaceExt(file.name, 'jpg'), { type: 'image/jpeg' })
}

export function scaleToFit(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w >= h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

function replaceExt(name: string, newExt: string): string {
  return name.replace(/\.[^.]+$/, '') + '.' + newExt
}
