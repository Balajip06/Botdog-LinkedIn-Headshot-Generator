import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  addEvalInput,
  markTrendEval,
  rateEvalRun,
  removeEvalInput,
  runEval,
} from './actions'

export const dynamic = 'force-dynamic'

interface TrendBrief {
  id: string
  slug: string
  title: string
  model: 'nano-banana' | 'nano-banana-pro'
  version: number
  eval_status: 'untested' | 'passed' | 'failed'
  is_active: boolean
}

interface EvalInputRow {
  id: string
  label: string
  image_url: string
  demographic_tag: string | null
  created_at: string
}

interface EvalRunRow {
  id: string
  trend_id: string
  prompt_version: number
  eval_input_id: string
  output_url: string | null
  admin_rating: string | null
  created_at: string
}

interface EvalPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    error?: string
    added?: string
    removed?: string
    ran?: string
    marked?: string
  }>
}

const inputClasses =
  'h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50'

export default async function EvalPage({ params, searchParams }: EvalPageProps) {
  const { id } = await params
  const flash = await searchParams

  const supabase = await createClient()

  const { data: trendRow } = await supabase
    .from('trends')
    .select('id, slug, title, model, version, eval_status, is_active')
    .eq('id', id)
    .maybeSingle()
  const trend = trendRow as unknown as TrendBrief | null
  if (!trend) notFound()

  const { data: inputRows } = await supabase
    .from('trend_eval_inputs')
    .select('id, label, image_url, demographic_tag, created_at')
    .eq('trend_id', id)
    .order('created_at', { ascending: true })
  const inputs = ((inputRows as unknown as EvalInputRow[] | null) ?? []).filter(Boolean)

  const { data: runRows } = await supabase
    .from('trend_eval_runs')
    .select('id, trend_id, prompt_version, eval_input_id, output_url, admin_rating, created_at')
    .eq('trend_id', id)
    .order('created_at', { ascending: false })
    .limit(inputs.length || 10)
  const latestRuns = ((runRows as unknown as EvalRunRow[] | null) ?? []).reduce<
    Record<string, EvalRunRow>
  >((acc, run) => {
    if (!acc[run.eval_input_id]) acc[run.eval_input_id] = run
    return acc
  }, {})

  const rated = Object.values(latestRuns).filter((r) => r.admin_rating === 'pass' || r.admin_rating === 'fail')
  const allRated = inputs.length > 0 && rated.length === inputs.length
  const anyFail = rated.some((r) => r.admin_rating === 'fail')

  async function boundAdd(formData: FormData): Promise<void> {
    'use server'
    await addEvalInput(id, formData)
  }
  async function boundRun(): Promise<void> {
    'use server'
    await runEval(id)
  }
  async function boundMarkPassed(): Promise<void> {
    'use server'
    await markTrendEval(id, 'passed')
  }
  async function boundMarkFailed(): Promise<void> {
    'use server'
    await markTrendEval(id, 'failed')
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Eval — {trend.title}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            /{trend.slug} · v{trend.version} · model {trend.model} · eval{' '}
            <code>{trend.eval_status}</code> · {trend.is_active ? 'live' : 'draft'}
          </p>
        </div>
        <Link
          href={`/admin/trends/${trend.id}/edit`}
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          ← Edit trend
        </Link>
      </header>

      {flash.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {decodeURIComponent(flash.error)}
        </p>
      )}
      {flash.added && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Reference photo added.
        </p>
      )}
      {flash.ran && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Test run dispatched.
        </p>
      )}
      {flash.marked === 'passed' && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Trend eval marked passed. Activate from the Edit page.
        </p>
      )}
      {flash.marked === 'failed' && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Trend eval marked failed.
        </p>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reference photos</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Paste public image URLs covering the demographic + lighting + age ranges this trend
          should handle.
        </p>

        <form action={boundAdd} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_1fr_auto]">
          <input name="label" required maxLength={80} placeholder="Label (e.g. child / glasses / dark)" className={inputClasses} />
          <input name="image_url" required type="url" placeholder="https://…" className={inputClasses} />
          <input name="demographic_tag" maxLength={40} placeholder="Tag (optional)" className={inputClasses} />
          <button
            type="submit"
            className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add
          </button>
        </form>

        {inputs.length > 0 && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inputs.map((input) => {
              async function boundRemove(): Promise<void> {
                'use server'
                await removeEvalInput(id, input.id)
              }
              return (
                <li
                  key={input.id}
                  className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="aspect-square overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={input.image_url} alt={input.label} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{input.label}</div>
                      {input.demographic_tag && (
                        <div className="text-xs text-zinc-500">{input.demographic_tag}</div>
                      )}
                    </div>
                    <form action={boundRemove}>
                      <button
                        type="submit"
                        className="text-xs text-red-600 underline-offset-2 hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Test run</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Generates one output per reference photo using the current prompt + model.
            {inputs.length === 0 && ' Add at least one reference photo first.'}
          </p>
        </div>
        <form action={boundRun}>
          <button
            type="submit"
            disabled={inputs.length === 0}
            className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Test now ({inputs.length})
          </button>
        </form>
      </div>

      {inputs.length > 0 && Object.keys(latestRuns).length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Results</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Rate each row. Once every row is rated you can mark the trend overall.
          </p>
          <ul className="mt-4 flex flex-col gap-4">
            {inputs.map((input) => {
              const run = latestRuns[input.id]
              if (!run) return null

              async function boundRatePass(): Promise<void> {
                'use server'
                await rateEvalRun(id, run.id, 'pass')
              }
              async function boundRateFail(): Promise<void> {
                'use server'
                await rateEvalRun(id, run.id, 'fail')
              }

              return (
                <li
                  key={run.id}
                  className="grid gap-3 rounded-md border border-zinc-100 p-3 dark:border-zinc-800 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
                >
                  <div className="aspect-square overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={input.image_url} alt={`input ${input.label}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="aspect-square overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    {run.output_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={run.output_url} alt={`output for ${input.label}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-red-600">
                        {run.admin_rating?.startsWith('error:') ? run.admin_rating : 'pending'}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{input.label}</div>
                    <div className="flex gap-2">
                      <form action={boundRatePass}>
                        <button
                          type="submit"
                          className={`h-8 rounded-md px-3 text-xs font-medium ${
                            run.admin_rating === 'pass'
                              ? 'bg-emerald-600 text-white'
                              : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                          }`}
                        >
                          Pass
                        </button>
                      </form>
                      <form action={boundRateFail}>
                        <button
                          type="submit"
                          className={`h-8 rounded-md px-3 text-xs font-medium ${
                            run.admin_rating === 'fail'
                              ? 'bg-red-600 text-white'
                              : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                          }`}
                        >
                          Fail
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Mark trend</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {allRated
              ? anyFail
                ? 'At least one ref failed — mark trend failed.'
                : 'All refs passed — mark trend passed to enable activation.'
              : `Rate all ${inputs.length} ref(s) before marking the trend overall.`}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={boundMarkPassed}>
            <button
              type="submit"
              disabled={!allRated || anyFail}
              className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark passed
            </button>
          </form>
          <form action={boundMarkFailed}>
            <button
              type="submit"
              disabled={!allRated}
              className="h-10 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark failed
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
