-- Migration 0016 — auto-deactivate cold trends (nightly pg_cron)
--
-- Buyers reviewing /admin/trends shouldn't see twenty zombie trends
-- nobody runs. This cron reaps trends that:
--   * are currently active (`is_active = true`)
--   * are not featured (curators have hand-pinned them; respect that)
--   * have not been opted out of the reaper (`auto_deactivate_disabled`)
--   * have been live long enough to find an audience (`activated_at`
--     older than 14 days — cold-start grace; trends need a fair shot)
--   * underperformed the trend-specific threshold over the last 7 days
--     (default 5 completed gens / 7d; per-trend overridable)
--
-- The row is flagged inactive + `expires_at = now()` and an
-- `admin_audit_log` entry is written with `admin_id = NULL` to mark the
-- action as system-attributable. The audit `after` payload captures the
-- gen count + threshold so a curator reviewing the audit log can decide
-- whether to re-activate.
--
-- Schedule wrapped in a pg_extension guard so `supabase reset` works on
-- a dev stack that hasn't enabled pg_cron — matches the pattern in
-- 20260527000005_pg_cron.sql.

create or replace function public.auto_deactivate_cold_trends()
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_count int;
begin
  for r in
    select id, slug, auto_deactivate_threshold
      from public.trends
     where is_active = true
       and is_featured = false
       and auto_deactivate_disabled = false
       and activated_at is not null
       and activated_at < now() - interval '14 days'
  loop
    select count(*) into v_count
      from public.generations g
     where g.trend_id = r.id
       and g.status = 'completed'
       and g.created_at >= now() - interval '7 days';

    if v_count < r.auto_deactivate_threshold then
      update public.trends
         set is_active  = false,
             expires_at = now()
       where id = r.id;

      insert into public.admin_audit_log (admin_id, action, target_table, target_id, after)
      values (
        null,
        'auto_deactivate',
        'trends',
        r.id,
        jsonb_build_object(
          'reason',        'cold_trend',
          'gen_count_7d',  v_count,
          'threshold',     r.auto_deactivate_threshold
        )
      );
    end if;
  end loop;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'auto_deactivate_cold_trends',
      '30 0 * * *',
      $cron$ select public.auto_deactivate_cold_trends() $cron$
    );
  end if;
end $$;
