import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'

/**
 * Layout for the admin authentication surfaces (login, forgot/reset password).
 *
 * Intentionally minimal — it must NOT render `AdminShell` because the shell
 * assumes an authenticated admin session. These pages are reachable while
 * unauthenticated (middleware allows them through; see lib/supabase/middleware.ts).
 *
 * Mirrors the style of `app/(auth)/layout.tsx` so admins land on a familiar
 * card-on-spotlight surface.
 */
export default function AdminPublicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="bg-gradient-spotlight absolute inset-0 -z-10 opacity-30 blur-3xl"
      />
      <div className="border-border/60 bg-card/80 shadow-pop relative w-full max-w-sm rounded-2xl border p-8 backdrop-blur-xl">
        <Link href="/" className="mb-6 inline-flex">
          <Logo gradient />
        </Link>
        {children}
      </div>
    </main>
  )
}
