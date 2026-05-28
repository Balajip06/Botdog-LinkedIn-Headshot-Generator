import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Admin
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-300">
            <Link href="/admin/trends" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Trends
            </Link>
            <Link href="/admin/suggestions" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Suggestions
            </Link>
            <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
              ← Back to app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  )
}
