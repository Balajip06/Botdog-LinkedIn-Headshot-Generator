import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

// Next 16 renamed "middleware" -> "proxy". File + exported function name both changed.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico, images, public assets
     * - api/stripe/webhook (handles its own raw body + idempotency)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
}
