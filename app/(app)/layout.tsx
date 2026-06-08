import { LogOut } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { BottomNav } from '@/components/nav/BottomNav'
import { PushBootstrapper } from '@/components/push/PushBootstrapper'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from './_actions/sign-out'

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Middleware already gates /me + /result to authed users — user is
  // guaranteed to be present. Read email for the header identity block.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? null

  return (
    <div className="flex min-h-screen flex-col">
      {/* Silent service-worker registration — opt-in for push subscription
          happens later in ResultView after the first successful generation. */}
      <PushBootstrapper />
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
              href="/"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-white/85 hover:text-white sm:inline-block"
            >
              New headshot
            </Link>
            <Link
              href="/me/creations"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-white/85 hover:text-white sm:inline-block"
            >
              My creations
            </Link>
            {email && (
              <div className="hidden items-center gap-2 rounded-full border border-white/30 py-1 pr-1 pl-3 sm:flex">
                <span className="max-w-[140px] truncate text-xs font-semibold text-white/90">
                  {email}
                </span>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    aria-label="Sign out"
                    className="grid size-7 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <LogOut className="size-3.5" aria-hidden="true" />
                  </button>
                </form>
              </div>
            )}
            {email && (
              <form action={signOutAction} className="sm:hidden">
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="grid size-8 place-items-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <LogOut className="size-3.5" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-10 sm:pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
