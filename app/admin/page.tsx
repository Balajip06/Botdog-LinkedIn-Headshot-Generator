import Link from 'next/link'

export default function AdminHome() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Admin
      </h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/trends"
          className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Trends</h2>
          <p className="mt-1 text-sm text-zinc-500">Create, edit, activate, retire trends.</p>
        </Link>
        <Link
          href="/admin/suggestions"
          className="rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Suggestions</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Auto-detected + community-submitted trend candidates.
          </p>
        </Link>
      </div>
    </section>
  )
}
