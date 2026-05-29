/**
 * Best-effort writer for `admin_audit_log`. The table has RLS but no INSERT
 * policy, so we route every write through the service-role client. Errors are
 * swallowed because an audit failure must never block a user-visible admin
 * action — call sites already redirect on completion regardless.
 *
 * Read access stays gated on `admin_users` via the existing SELECT policy
 * (migration 0004). This helper only handles writes.
 */

import { createServiceClient } from '@/lib/supabase/server'

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
    await service.from('admin_audit_log').insert({
      admin_id: args.adminId,
      action: args.action,
      target_table: args.targetTable,
      target_id: args.targetId,
      before: (args.before ?? null) as never,
      after: (args.after ?? null) as never,
    })
  } catch {
    // Swallow — audit failure must not break the user-facing action.
  }
}
