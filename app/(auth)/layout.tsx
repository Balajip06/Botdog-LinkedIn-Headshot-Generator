import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-cream relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="bg-gradient-spotlight absolute inset-0 -z-10 opacity-30 blur-3xl"
      />
      <div className="border-border/60 bg-card/80 shadow-pop relative w-full max-w-sm rounded-2xl border p-8 backdrop-blur-xl">
        <Link
          href="/"
          aria-label="Botdog home"
          className="bg-primary shadow-soft mb-6 inline-flex items-center rounded-2xl px-4 py-2"
        >
          <Logo gradient />
        </Link>
        {children}
      </div>
    </main>
  )
}
