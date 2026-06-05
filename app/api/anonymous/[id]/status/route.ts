import { NextResponse, type NextRequest } from 'next/server'
import { anonymousResultIpLimiter } from '@/lib/rate-limit'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface StatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'failed_retryable'
  output_image_url: string | null
}

/**
 * Poll endpoint for the in-card anonymous-trial flow. The `anonymous_attempts`
 * table is service-role only (no auth.uid), so the id itself is the capability —
 * matching the noindex `/anonymous/[id]` share page. We never leak the signed
 * output URL once the 24h trial window has expired.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limited = await anonymousResultIpLimiter.limit(`anon-status:${ip}`)
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('anonymous_attempts')
    .select('status, output_image_url, expires_at')
    .eq('id', id)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const expired = new Date(data.expires_at).getTime() <= Date.now()
  const body: StatusResponse = {
    status: data.status,
    output_image_url: expired ? null : data.output_image_url,
  }
  return NextResponse.json(body)
}
