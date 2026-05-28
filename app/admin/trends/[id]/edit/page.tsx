import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toggleActive, updateTrend } from '../../actions'
import { TrendForm } from '../../TrendForm'

export const dynamic = 'force-dynamic'

interface FullTrend {
  id: string
  slug: string
  title: string
  description: string | null
  prompt_template: string
  model: 'nano-banana' | 'nano-banana-pro'
  aspect_ratio: '1:1' | '3:4' | '16:9' | '9:16'
  display_order: number
  thumbnail_url: string | null
  sample_before_url: string | null
  sample_after_url: string | null
  seo_title: string | null
  seo_description: string | null
  input_schema: unknown
  faq: unknown
  is_active: boolean
  eval_status: 'untested' | 'passed' | 'failed'
  version: number
}

interface EditTrendPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; saved?: string; created?: string; activated?: string }>
}

export default async function EditTrendPage({ params, searchParams }: EditTrendPageProps) {
  const { id } = await params
  const { error, saved, created, activated } = await searchParams

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('trends')
    .select(
      'id, slug, title, description, prompt_template, model, aspect_ratio, display_order, thumbnail_url, sample_before_url, sample_after_url, seo_title, seo_description, input_schema, faq, is_active, eval_status, version'
    )
    .eq('id', id)
    .maybeSingle()
  const trend = (row as unknown as FullTrend | null) ?? null
  if (!trend) notFound()

  async function boundUpdate(formData: FormData): Promise<void> {
    'use server'
    await updateTrend(id, formData)
  }

  async function boundToggle(): Promise<void> {
    'use server'
    await toggleActive(id, !trend!.is_active)
  }

  const canActivate = trend.eval_status === 'passed'

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {trend.title}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            /{trend.slug} · v{trend.version} · eval: <code>{trend.eval_status}</code> ·{' '}
            {trend.is_active ? 'live' : 'draft'}
          </p>
        </div>
        <Link
          href="/admin/trends"
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          ← Back
        </Link>
      </header>

      <TrendForm
        action={boundUpdate}
        initial={trend}
        submitLabel="Save"
        banner={
          <>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {decodeURIComponent(error)}
              </p>
            )}
            {(saved || created) && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {created ? 'Draft created.' : 'Saved.'}
              </p>
            )}
            {activated === '1' && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Activated.
              </p>
            )}
            {activated === '0' && (
              <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Deactivated.
              </p>
            )}
          </>
        }
        extraActions={
          <form action={boundToggle}>
            <button
              type="submit"
              disabled={!trend.is_active && !canActivate}
              title={
                !trend.is_active && !canActivate
                  ? 'Eval must pass before activating'
                  : undefined
              }
              className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              {trend.is_active ? 'Deactivate' : canActivate ? 'Activate' : 'Activate (eval required)'}
            </button>
          </form>
        }
      />
    </section>
  )
}
