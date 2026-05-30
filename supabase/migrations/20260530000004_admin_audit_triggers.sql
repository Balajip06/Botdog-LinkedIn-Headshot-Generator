-- Migration 0023 — DB triggers as source of truth for admin_audit_log
--
-- Red-team CRITICAL C4: `lib/admin/audit.ts` writes audit rows from
-- application code via the service-role client, wrapped in a
-- swallow-all-errors try/catch. Any audit failure (RLS misconfig, schema
-- drift, DB outage) silently drops the entry. Worse: the audit-write is
-- call-site-dependent, so any future admin server action that forgets
-- the `logAdminAction(...)` call leaves no trail at all.
--
-- Fix: move the canonical write into AFTER triggers on the
-- security-load-bearing columns. The app-level helper stays as a
-- supplemental context source (justification text, target labels) and
-- the catch now reports to Sentry instead of swallowing silently — but
-- the trigger is the source of truth.
--
-- Scope: only the columns whose mutations either bypass quota or change
-- the public eligibility of a trend. Auditing every column on every
-- table would 10× the write volume for no security benefit.
--   - trends.is_active        (eligibility — touches non-negotiable #5)
--   - trends.eval_status      (eligibility gate — non-negotiable #5)
--   - trends.prompt_template  (CLAUDE.md gotcha: edits should reset eval)
--   - profiles.is_vip         (quota bypass — non-negotiable #1)
--
-- Actor attribution:
--   1. Prefer auth.uid() if non-null (direct anon-key / authed RLS call).
--   2. Fall back to current_setting('app.admin_actor', true)::uuid when
--      the trigger fires from a service-role server action that has
--      stamped the GUC for this transaction. Server actions wrap their
--      service-role calls in:
--          set local app.admin_actor = '<admin user id>';
--      so the trigger captures the human attribution even when RLS is
--      bypassed.
--   3. Fall back to NULL (system-attributed, e.g. pg_cron jobs that
--      currently write their own audit row inline — those rows are
--      already created in the same transaction as the mutation and
--      remain valid).

create or replace function public.audit_trends_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
begin
  v_actor := coalesce(
    auth.uid(),
    nullif(current_setting('app.admin_actor', true), '')::uuid
  );

  if tg_op = 'UPDATE' then
    if new.is_active is distinct from old.is_active then
      insert into public.admin_audit_log (admin_id, action, target_table, target_id, before, after)
      values (
        v_actor, 'trend_is_active_change', 'trends', new.id::text,
        jsonb_build_object('is_active', old.is_active),
        jsonb_build_object('is_active', new.is_active, 'eval_status', new.eval_status)
      );
    end if;
    if new.eval_status is distinct from old.eval_status then
      insert into public.admin_audit_log (admin_id, action, target_table, target_id, before, after)
      values (
        v_actor, 'trend_eval_status_change', 'trends', new.id::text,
        jsonb_build_object('eval_status', old.eval_status),
        jsonb_build_object('eval_status', new.eval_status)
      );
    end if;
    if new.prompt_template is distinct from old.prompt_template then
      insert into public.admin_audit_log (admin_id, action, target_table, target_id, before, after)
      values (
        v_actor, 'trend_prompt_change', 'trends', new.id::text,
        jsonb_build_object('prompt_template_hash', md5(coalesce(old.prompt_template, ''))),
        jsonb_build_object('prompt_template_hash', md5(coalesce(new.prompt_template, '')))
      );
    end if;
  elsif tg_op = 'INSERT' then
    insert into public.admin_audit_log (admin_id, action, target_table, target_id, after)
    values (
      v_actor, 'trend_create', 'trends', new.id::text,
      jsonb_build_object(
        'slug', new.slug,
        'is_active', new.is_active,
        'eval_status', new.eval_status
      )
    );
  elsif tg_op = 'DELETE' then
    insert into public.admin_audit_log (admin_id, action, target_table, target_id, before)
    values (
      v_actor, 'trend_delete', 'trends', old.id::text,
      jsonb_build_object('slug', old.slug)
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trends_audit on public.trends;
create trigger trends_audit
  after insert or update or delete on public.trends
  for each row execute function public.audit_trends_changes();

create or replace function public.audit_profiles_vip_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
begin
  if new.is_vip is not distinct from old.is_vip then
    return new;
  end if;

  v_actor := coalesce(
    auth.uid(),
    nullif(current_setting('app.admin_actor', true), '')::uuid
  );

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, before, after)
  values (
    v_actor,
    case when new.is_vip then 'vip_grant' else 'vip_revoke' end,
    'profiles',
    new.id::text,
    jsonb_build_object('is_vip', old.is_vip),
    jsonb_build_object(
      'is_vip',         new.is_vip,
      'vip_reason',     new.vip_reason,
      'vip_granted_by', new.vip_granted_by,
      'vip_granted_at', new.vip_granted_at
    )
  );
  return new;
end;
$$;

drop trigger if exists profiles_vip_audit on public.profiles;
create trigger profiles_vip_audit
  after update on public.profiles
  for each row execute function public.audit_profiles_vip_changes();

comment on function public.audit_trends_changes is
  'Source of truth for trends admin audit. Captures actor via auth.uid() (RLS path) or app.admin_actor GUC (service-role path). Replaces app-level lib/admin/audit.ts as the canonical writer for trends.';
comment on function public.audit_profiles_vip_changes is
  'Source of truth for VIP grant/revoke audit. Quota-bypass changes (non-negotiable #1) must leave a forensic trail even if the calling server action forgets to call logAdminAction.';
