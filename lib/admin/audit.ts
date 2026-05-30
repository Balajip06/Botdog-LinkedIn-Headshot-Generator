/**
 * Supplemental writer for `admin_audit_log`. The canonical source of truth
 * is now the DB triggers in migration 0023
 * (`audit_trends_changes` + `audit_profiles_vip_changes`) — those fire on
 * every state-changing mutation regardless of whether the calling code
 * remembered to log. This helper exists for context fields the trigger
 * cannot see: human-readable target labels, free-text justifications,
 * action names outside the trigger's scope (e.g. refunds, manual credit
 * grants logged from the webhook).
 *
 * Failures are reported to Sentry instead of swallowed silently. An audit
 * write failure is a forensic-trail outage and must surface in monitoring
 * even though it never blocks the user-facing action.
 *
 * Read access stays gated on `admin_users` via the existing SELECT policy
 * (migration 0004).
 */

import * as Sentry from '@sentry/nextjs'
import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

export interface AdminAuditArgs {
  adminId: string | null
  action: string
  targetTable: string
  targetId: string | null
  before?: unknown
  after?: unknown
}

export async function logAdminAction(args: AdminAuditArgs): Promise<void> {
  try {
    const service = createServiceClient()
    const { error } = await service.from('admin_audit_log').insert({
      admin_id: args.adminId,
      action: args.action,
      target_table: args.targetTable,
      target_id: args.targetId,
      before: (args.before ?? null) as Json | null,
      after: (args.after ?? null) as Json | null,
    })
    if (error) {
      Sentry.captureException(new Error(`audit insert failed: ${error.message}`), {
        extra: { action: args.action, targetTable: args.targetTable, targetId: args.targetId },
      })
    }
  } catch (err: unknown) {
    Sentry.captureException(err, {
      extra: { action: args.action, targetTable: args.targetTable, targetId: args.targetId },
    })
  }
}
