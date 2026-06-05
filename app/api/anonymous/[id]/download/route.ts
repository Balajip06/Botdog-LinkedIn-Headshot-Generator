import { NextResponse, type NextRequest } from 'next/server'
import { anonymousResultIpLimiter } from '@/lib/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'
import { applyWatermark } from '@/lib/watermark/compose'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** SSRF guard before fetching the stored output URL server-side. */
function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const supaHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname
    return u.protocol === 'https:' && !!supaHost && u.hostname === supaHost
  } catch {
    return false
  }
}

/**
 * Watermarked download for an anonymous-trial result. The anon tier is the
 * freest tier, so non-negotiable #8 (watermark on free downloads) applies — we
 * fetch the stored output and stamp it server-side before returning. The id is
 * the capability (table is service-role only); expired trials 404.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = await anonymousResultIpLimiter.limit(`anon-download:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('anonymous_attempts')
    .select('output_image_url, status, expires_at')
    .eq('id', id)
    .maybeSingle()

  if (!data || data.status !== 'completed' || !data.output_image_url) {
    return NextResponse.json({ error: 'Not ready' }, { status: 404 })
  }
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Trial expired' }, { status: 410 })
  }
  if (!isAllowedImageUrl(data.output_image_url)) {
    return NextResponse.json({ error: 'Invalid output' }, { status: 502 })
  }

  const upstream = await fetch(data.output_image_url)
  if (!upstream.ok) return NextResponse.json({ error: 'Image fetch failed' }, { status: 502 })
  const raw = Buffer.from(await upstream.arrayBuffer())
  const watermarked = await applyWatermark(raw)

  return new NextResponse(new Uint8Array(watermarked), {
    headers: {
      'content-type': 'image/png',
      'content-disposition': 'attachment; filename="botdog-headshot.png"',
      'cache-control': 'private, no-store',
    },
  })
}
