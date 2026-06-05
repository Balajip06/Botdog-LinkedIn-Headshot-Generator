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
          className="bg-primary text-primary-foreground shadow-nav mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-full px-5 sm:px-6"
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
              className="rounded-full px-3 py-2 text-sm font-medium text-white/85 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/#create"
              className="text-primary rounded-full bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/90"
            >
              Create headshot
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-border bg-muted mt-16 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo size="sm" gradient />
            <p>Professional headshots, generated. © {new Date().getFullYear()} Botdog.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/#create" className="hover:text-foreground">
              Create headshot
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
