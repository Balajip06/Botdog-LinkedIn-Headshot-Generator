import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResultView } from './ResultView'

export const dynamic = 'force-dynamic'

interface InitialRow {
  id: string
  user_id: string
  trend_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'failed_retryable'
  output_image_url: string | null
  error_message: string | null
  attempts: number
  idempotency_key: string
  created_at: string
}

interface TrendBrief {
  slug: string
  title: string
}

interface ResultPageProps {
  params: Promise<{ id: string }>
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/result/${id}`)

  const { data: row } = await supabase
    .from('generations')
    .select('id, user_id, trend_id, status, output_image_url, error_message, attempts, idempotency_key, created_at')
    .eq('id', id)
    .maybeSingle()

  const gen = row as unknown as InitialRow | null
  if (!gen) notFound()
  if (gen.user_id !== user.id) notFound() // hide via 404 rather than 403 to avoid id-leaks

  const { data: trendRow } = await supabase
    .from('trends')
    .select('slug, title')
    .eq('id', gen.trend_id)
    .maybeSingle()
  const trend = (trendRow as unknown as TrendBrief | null) ?? { slug: 'unknown', title: 'Trend' }

  return <ResultView initial={gen} trend={trend} />
}
