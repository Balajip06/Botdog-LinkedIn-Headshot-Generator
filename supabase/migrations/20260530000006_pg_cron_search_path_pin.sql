-- Migration 0025 — Pin search_path on every pg_cron job
--
-- Red-team HIGH H7: the four cron jobs in migration 0005 ran inline SQL
-- strings as the `postgres` superuser without `SET search_path = public`.
-- If an attacker can create a schema (extension-installer paths) and
-- shadow a table name in their schema, the cron run could write to or
-- read from the attacker schema instead of `public`. Same surface that
-- the project already mitigates on every trigger function — pg_cron jobs
-- were the gap.
--
-- Fix: wrap each job in a SECURITY DEFINER function with explicit
-- `set search_path = public`, unschedule the inline cron, and reschedule
-- to call the new function. Matches the pattern in migrations 0016 and
-- 0018 (auto_deactivate_cold_trends, trend_discovery_heartbeat).

create or replace function public.reset_free_weekly()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set free_used_this_week = 0,
         free_week_starts_at = date_trunc('week', now())
   where deleted_at is null
     and free_used_this_week > 0;
end;
$$;

create or replace function public.purge_expired_generations()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.generations
   where purge_at is not null
     and purge_at < now();
end;
$$;

create or replace function public.purge_expired_anonymous()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.anonymous_attempts
   where expires_at < now();
end;
$$;

create or replace function public.purge_soft_deleted_profiles()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.profiles
   where deleted_at is not null
     and deleted_at < now() - interval '30 days';
end;
$$;

-- Reschedule. cron.unschedule is idempotent on missing jobs (returns null);
-- we wrap in a do-block so missing schedules don't abort the migration on
-- environments that never ran 0005 (pure dev resets).
do $$
begin
  perform cron.unschedule('reset_free_weekly');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('purge_expired_generations');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('purge_expired_anonymous');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('purge_soft_deleted_profiles');
exception when others then null;
end $$;

select cron.schedule('reset_free_weekly',           '0 0 * * 0',  $$select public.reset_free_weekly();$$);
select cron.schedule('purge_expired_generations',   '15 2 * * *', $$select public.purge_expired_generations();$$);
select cron.schedule('purge_expired_anonymous',     '30 2 * * *', $$select public.purge_expired_anonymous();$$);
select cron.schedule('purge_soft_deleted_profiles', '45 2 * * *', $$select public.purge_soft_deleted_profiles();$$);
