import { NextResponse, type NextRequest } from 'next/server'
import { anonymousUploadIpLimiter } from '@/lib/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_BYTES = 12 * 1024 * 1024 // 12 MB — client already downscales to 2048px JPEG
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
const SIGNED_URL_TTL_SECONDS = 3600

/** Verify the real file signature (magic bytes) for JPEG / PNG / WebP. */
function hasSupportedImageMagic(b: Uint8Array): boolean {
  if (b.length < 12) return false
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true
  // WebP: "RIFF"...."WEBP"
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return true
  }
  return false
}

/**
 * Anonymous-trial image upload. Logged-out visitors have no Supabase session, so
 * they cannot write to the RLS-protected `uploads` bucket directly. This route
 * accepts one prepared image, stores it under `anon/<uuid>` via the service
 * client, and returns a short-lived signed URL the anon generate route consumes.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = await anonymousUploadIpLimiter.limit(`upload:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many uploads — try again later' }, { status: 429 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 })
  }

  const supabase = createServiceClient()
  const path = `anon/${crypto.randomUUID()}.jpg`
  const bytes = new Uint8Array(await file.arrayBuffer())

  // Don't trust the client-declared MIME — verify the actual file signature so a
  // disguised payload (SVG/zip/polyglot) can't be stored + later fetched.
  if (!hasSupportedImageMagic(bytes)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
  }

  const { error: uploadErr } = await supabase.storage
    .from('uploads')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false })
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from('uploads')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: signErr?.message ?? 'Sign failed' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
