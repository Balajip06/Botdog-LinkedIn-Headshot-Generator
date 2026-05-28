import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface AdminTrendRow {
  id: string
  slug: string
  title: string
  is_active: boolean
  eval_status: 'untested' | 'passed' | 'failed'
  model: 'nano-banana' | 'nano-banana-pro'
  display_order: number
  version: number
  updated_at: string
}

export default async function AdminTrendsList() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('trends')
    .select('id, slug, title, is_active, eval_status, model, display_order, version, updated_at')
    .order('display_order', { ascending: true })

  const trends = (rows as unknown as AdminTrendRow[] | null) ?? []

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Trends
        </h1>
        <Link
          href="/admin/trends/new"
          className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium leading-10 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New trend
        </Link>
      </header>

      {trends.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No trends yet. Create one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Title / slug</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Eval</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {trends.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 text-zinc-500">{t.display_order}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">{t.title}</div>
                    <div className="text-xs text-zinc-500">/{t.slug} · v{t.version}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.model}</td>
                  <td className="px-4 py-3">
                    <EvalPill status={t.eval_status} />
                  </td>
                  <td className="px-4 py-3">
                    <ActivePill active={t.is_active} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(t.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/trends/${t.id}/edit`}
                      className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function EvalPill({ status }: { status: AdminTrendRow['eval_status'] }) {
  const tone =
    status === 'passed'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : status === 'failed'
        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status}
    </span>
  )
}

function ActivePill({ active }: { active: boolean }) {
  const tone = active
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {active ? 'live' : 'draft'}
    </span>
  )
}
