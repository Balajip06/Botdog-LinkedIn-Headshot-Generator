import { Gift } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReferralCopyButton } from '@/app/(app)/me/settings/ReferralCopyButton'
import { AccountStudio, type RecentCreation } from '@/components/account/AccountStudio'
import { AdPlaceholder } from '@/components/account/AdPlaceholder'
import { BotdogPlanCard } from '@/components/account/BotdogPlanCard'
import { MOCK_GENERATIONS, MOCK_TRENDS_ENABLED } from '@/lib/dev/mock-data'
import { getCurrentProfile } from '@/lib/profiles/server'
import { buildReferralUrl } from '@/lib/referrals/links'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { HEADSHOT_FUNNEL } from '@/lib/trends/headshot'
import { getActiveTrendBySlug } from '@/lib/trends/repository'

export const dynamic = 'force-dynamic'

const HEADSHOT_SLUG = 'linkedin-headshot'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RECENT_LIMIT = 6

interface PageProps {
  searchParams?: Promise<{ anon?: string }>
}

interface AccountData {
  userId: string
  credits: number
  freeUsedThisWeek: number
  referralUrl: string | null
  recent: RecentCreation[]
}

export default async function AccountPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}
  const anonId = typeof sp.anon === 'string' && UUID_RE.test(sp.anon) ? sp.anon : ''

  const trend = await getActiveTrendBySlug(HEADSHOT_SLUG)
  let data: AccountData

  if (MOCK_TRENDS_ENABLED) {
    data = {
      userId: 'mock-user',
      credits: 0,
      freeUsedThisWeek: 0,
      referralUrl: 'http://localhost:3000/?ref=000000000000',
      recent: MOCK_GENERATIONS.slice(0, RECENT_LIMIT).map((g) => ({
        id: g.id,
        output_image_url: g.output_image_url,
      })),
    }
  } else {
    const profile = await getCurrentProfile()
    if (!profile) redirect('/login?next=/me/creations')

    // Claim a just-completed anonymous trial into this account BEFORE fetching
    // recent rows so the claimed image shows immediately. Best-effort — never
    // blocks the page. The magic link carries ?anon=<attempt id>.
    if (anonId) {
      try {
        const service = createServiceClient()
        await service.rpc('claim_anonymous_attempt', {
          p_attempt_id: anonId,
          p_user_id: profile.id,
        })
        // Mark the email lead converted (funnel stage 3 -> 4). Best-effort;
        // read-time correlation in lib/analytics/funnel.ts is the fallback.
        await service
          .from('email_leads')
          .update({ converted_user_id: profile.id, converted_at: new Date().toISOString() } as never)
          .eq('email', profile.email)
          .is('converted_user_id', null)
      } catch (err) {
        console.error('[claim_anonymous_attempt]', err)
      }
    }

    const supabase = await createClient()
    const { data: rows } = await supabase
      .from('generations')
      .select('id, output_image_url')
      .eq('user_id', profile.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    data = {
      userId: profile.id,
      credits: profile.credits_balance,
      freeUsedThisWeek: profile.free_used_this_week,
      referralUrl: buildReferralUrl(siteUrl, profile.referral_code),
      recent: (rows ?? []).filter(Boolean),
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Your <span className="text-gradient-hero">account</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Generate a headshot, see your gallery, and manage your plan.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <AdPlaceholder />

        <div className="flex flex-col gap-6">
          <AccountStudio
            trend={
              trend
                ? { slug: trend.slug, input_schema: trend.input_schema, model: trend.model }
                : null
            }
            userId={data.userId}
            credits={data.credits}
            freeUsedThisWeek={data.freeUsedThisWeek}
            freeWeekly={HEADSHOT_FUNNEL.freeWeekly}
            recent={data.recent}
            mock={MOCK_TRENDS_ENABLED}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <BotdogPlanCard />
            {data.referralUrl && (
              <div className="border-border/60 bg-card rounded-3xl border p-6">
                <div className="flex items-center gap-2">
                  <Gift className="text-primary size-5" />
                  <h2 className="text-xl">Refer &amp; earn</h2>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  +10 credits for every friend who finishes their first headshot.
                </p>
                <div className="border-border bg-muted/40 mt-4 flex items-center gap-2 rounded-2xl border p-2">
                  <code className="flex-1 truncate px-3 py-2 font-mono text-xs">
                    {data.referralUrl}
                  </code>
                  <ReferralCopyButton url={data.referralUrl} />
                </div>
              </div>
            )}
          </div>

          <div>
            <Link
              href="/me/creations/all"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              View all creations →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
