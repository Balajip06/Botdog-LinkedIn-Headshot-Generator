import { LogOut } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { PushBootstrapper } from '@/components/push/PushBootstrapper'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
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
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <Link href="/" aria-label="Trendly home" className="-m-2 p-2">
            <Logo gradient />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/me/studio"
              className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Studio
            </Link>
            <Link
              href="/me/creations"
              className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              My creations
            </Link>
            <Link
              href="/me/settings"
              className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Settings
            </Link>
            <ThemeToggle />
            {email && (
              <div
                className="ml-1 hidden items-center gap-2 rounded-full border border-border/60 bg-card/40 py-1 pl-3 pr-1 sm:flex"
                title={email}
              >
                <span className="max-w-[160px] truncate text-xs font-semibold text-foreground">
                  {email}
                </span>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    aria-label="Sign out"
                    className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                  className="grid size-8 place-items-center rounded-full border border-border/60 bg-card/40 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <LogOut className="size-3.5" aria-hidden="true" />
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </div>
  )
}
