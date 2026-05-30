-- Migration 0014 — trends lifecycle (schedule + clone + feature + auto-deactivate)
--
-- Four lifecycle affordances admins need before the listing is credible:
--   1. `goes_live_at` — schedule a trend in advance (the public-read RLS
--      policy is rewritten below to honor this). Lets us seed a launch
--      calendar instead of toggling `is_active` at the moment we want it
--      live.
--   2. `is_featured` — pin a trend at the top of the home page + protect
--      it from the auto-deactivate cron. Trend curators can hand-pick.
--   3. `cloned_from` — provenance for the admin "clone trend" flow. The
--      cheapest way to ship a v2 of a tested trend without losing the
--      original's eval history is to copy the row and edit the prompt
--      on the copy. ON DELETE SET NULL because parent deletion shouldn't
--      cascade-delete the child.
--   4. `auto_deactivate_threshold` + `_disabled` + `activated_at` —
--      cold-trend reaper (see 20260529000010_pg_cron_auto_deactivate.sql).
--      `activated_at` is stamped by the trigger below whenever the
--      `is_active` flag flips false → true, giving the cron a clean
--      cold-start grace window. `_disabled = true` opts a trend out
--      entirely (e.g. evergreen brand trends).
--
-- The public-read RLS policy is rewritten in-place: we DROP and CREATE
-- (Postgres has no ALTER POLICY for the USING clause) so the new
-- `goes_live_at` gate is enforced consistently with the existing
-- `is_active` + `expires_at` gates.

alter table public.trends
  add column if not exists goes_live_at              timestamptz,
  add column if not exists is_featured               boolean not null default false,
  add column if not exists cloned_from               uuid references public.trends(id) on delete set null,
  add column if not exists auto_deactivate_threshold int  not null default 5,
  add column if not exists auto_deactivate_disabled  boolean not null default false,
  add column if not exists activated_at              timestamptz;

-- Stamp `activated_at` on every false → true transition of `is_active`.
-- The cron uses this as the cold-start grace anchor: a freshly activated
-- trend gets 14 days to find an audience before the reaper considers it.
create or replace function public.trends_activation_stamp()
returns trigger language plpgsql as $$
begin
  if new.is_active is true and (old.is_active is null or old.is_active is false) then
    new.activated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trends_stamp_activated_at on public.trends;
create trigger trends_stamp_activated_at
  before update of is_active on public.trends
  for each row execute function public.trends_activation_stamp();

-- Public-read policy rewrite — add `goes_live_at` gate. Drop + recreate
-- because there is no ALTER POLICY ... USING (...) in Postgres.
drop policy if exists "trends_public_read" on public.trends;
create policy "trends_public_read" on public.trends
  for select using (
    is_active = true
    and (expires_at is null or expires_at > now())
    and (goes_live_at is null or goes_live_at <= now())
  );
