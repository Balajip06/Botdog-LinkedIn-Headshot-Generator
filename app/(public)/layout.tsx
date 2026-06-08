import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Floating blue pill navbar (Botdog brand chrome). */}
      <header className="sticky top-0 z-30 px-4 pt-4">
        <nav
          aria-label="Primary"
          className="bg-primary text-primary-foreground shadow-nav mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 rounded-full px-5 sm:px-6"
        >
          <Link href="/" aria-label="Botdog home" className="-m-2 p-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/#how-it-works"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-white/85 hover:text-white sm:inline-block"
            >
              How it works
            </Link>
            <Link
              href="/#faq"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-white/85 hover:text-white sm:inline-block"
            >
              FAQ
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/60 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/#create"
              className="rounded-pill bg-accent-yellow px-4 py-2 text-sm font-bold text-darktext shadow-button transition-colors hover:bg-accent-yellow/90"
            >
              Create free headshot
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-darktext mt-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-white/70 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo size="sm" />
            <p className="text-white/50">Professional headshots, generated. © {new Date().getFullYear()} Botdog.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/#create" className="hover:text-white">
              Create headshot
            </Link>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
