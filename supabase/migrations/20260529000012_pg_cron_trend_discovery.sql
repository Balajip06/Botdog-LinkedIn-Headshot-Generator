-- Migration 0018 — weekly trend-discovery cron heartbeat
--
-- The actual trend-detector orchestrator (pulls Reddit / TikTok / IG, calls
-- the LLM proposer, inserts into `trend_suggestions`) runs in Node.js — it
-- needs `fetch`, the Gemini SDK, and Sentry, none of which work inside
-- Postgres. So execution lives in Vercel Cron, which hits
-- `POST /api/admin/run-trend-discovery` on the same schedule defined below.
--
-- This pg_cron job is a **heartbeat only**. It writes a row into
-- `admin_audit_log` every Monday at 08:00 UTC marking the run as due. If
-- the Vercel cron + the heartbeat both land their writes within the same
-- hour, the loop is healthy. If the heartbeat fires but no
-- `trend_discovery_run` row follows, the Vercel side is broken.
--
-- Guarded on `pg_extension` so `supabase reset` keeps working on a dev
-- stack without pg_cron — matches the pattern in 20260527000005_pg_cron.sql
-- and 20260529000010_pg_cron_auto_deactivate.sql.

create or replace function public.trend_discovery_heartbeat()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_audit_log (admin_id, action, target_table, target_id, after)
  values (
    null,
    'trend_discovery_due',
    'trend_suggestions',
    null,
    jsonb_build_object(
      'reason',     'weekly_heartbeat',
      'scheduled',  'monday_08_utc',
      'note',       'expect a trend_discovery_run row from Vercel cron within 1h'
    )
  );
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'trend_discovery_heartbeat',
      '0 8 * * 1',
      $cron$ select public.trend_discovery_heartbeat() $cron$
    );
  end if;
end $$;
