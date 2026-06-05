-- Migration 0034 — global active image model (app_settings singleton)
--
-- Adds an admin-controlled, app-wide "which image model serves customers" switch.
-- The admin flips it live (no redeploy, no trend deactivation); the Edge Function
-- reads it per generation. Decoupled from `trend_model` on purpose: a dedicated
-- `image_model` enum means flipping the active model never touches a trend row, so
-- the `bump_trend_version` eval-gate trigger never fires (the "realtime, skip-eval,
-- no-downtime" requirement). `trends.model` keeps driving the admin eval flow only.
--
-- Audit: per non-negotiable #7, the canonical audit write is a DB trigger
-- (mirrors audit_trends_changes in migration 0023), actor via auth.uid() (RLS
-- path) or the app.admin_actor GUC (service-role path).

create type public.image_model as enum ('nano-banana', 'nano-banana-pro', 'gpt-image-2');

-- Singleton: `id` is a boolean pinned to true, so at most one row can ever exist.
create table public.app_settings (
  id           boolean primary key default true,
  active_model image_model not null default 'nano-banana',
  updated_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

-- Seed the one row. Default 'nano-banana' preserves today's behavior.
insert into public.app_settings (id) values (true) on conflict do nothing;

alter table public.app_settings enable row level security;

-- Admins read + update; service role bypasses RLS (Edge reads it). No customer policy.
create policy "app_settings_admin_read" on public.app_settings
  for select using (exists (select 1 from public.admin_users where user_id = auth.uid()));

create policy "app_settings_admin_update" on public.app_settings
  for update using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

-- Canonical audit write (source of truth) — fires on active_model change.
create or replace function public.audit_app_settings_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
begin
  if new.active_model is not distinct from old.active_model then
    return new;
  end if;

  v_actor := coalesce(
    auth.uid(),
    nullif(current_setting('app.admin_actor', true), '')::uuid
  );

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, before, after)
  values (
    v_actor, 'active_model_change', 'app_settings', 'singleton',
    jsonb_build_object('active_model', old.active_model),
    jsonb_build_object('active_model', new.active_model)
  );
  return new;
end;
$$;

drop trigger if exists app_settings_audit on public.app_settings;
create trigger app_settings_audit
  after update on public.app_settings
  for each row execute function public.audit_app_settings_changes();

comment on table public.app_settings is
  'Singleton (id=true). active_model is the app-wide runtime authority for customer image generation, read per-generation by the generate-image Edge Function. Decoupled from trends.model (which now drives admin eval previews only).';
comment on function public.audit_app_settings_changes is
  'Source of truth for active_model change audit. Actor via auth.uid() (RLS path) or app.admin_actor GUC (service-role path).';
