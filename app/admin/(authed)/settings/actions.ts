'use server'

import * as Sentry from '@sentry/nextjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logAdminAction } from '@/lib/admin/audit'
import { createClient } from '@/lib/supabase/server'

const ActiveModelSchema = z.enum(['nano-banana', 'nano-banana-pro', 'gpt-image-2'])

/**
 * Set the app-wide active image model. Uses the authed (anon-key) client so
 * auth.uid() drives both the RLS update policy and the app_settings_audit
 * trigger's actor attribution. The DB trigger is the canonical audit writer;
 * the logAdminAction call adds supplemental context (mirrors updateTrend).
 */
export async function updateActiveModel(formData: FormData): Promise<void> {
  const parsed = ActiveModelSchema.safeParse(formData.get('active_model'))
  if (!parsed.success) {
    redirect(`/admin/settings?error=${encodeURIComponent('invalid model')}`)
  }
  const activeModel = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Middleware already gates /admin, but guard explicitly: an expired session would
  // otherwise hit a 0-row RLS no-op (no error) and still redirect as "saved".
  if (!user) redirect('/admin/login?next=/admin/settings')

  const { error } = await supabase
    .from('app_settings')
    .update({
      active_model: activeModel,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true)
  if (error) {
    // Don't echo raw PostgREST text into the URL/history — log it, show a generic message.
    Sentry.captureException(new Error(`updateActiveModel failed: ${error.message}`))
    redirect(`/admin/settings?error=${encodeURIComponent('Save failed — check server logs.')}`)
  }

  await logAdminAction({
    adminId: user.id,
    action: 'active_model_change',
    targetTable: 'app_settings',
    targetId: 'singleton',
    after: { active_model: activeModel },
  })

  revalidatePath('/admin/settings')
  redirect('/admin/settings?saved=1')
}
