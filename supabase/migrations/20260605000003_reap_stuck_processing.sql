-- Migration 0035 — reap generations stuck in 'processing'
--
-- The generate-image Edge Function now (migration set: OpenAI integration) does an
-- in-invocation provider fallback: it may call the active model AND, on failure, the
-- other provider — two sequential calls inside one ~150s Edge wall. If that budget is
-- exceeded the function is killed mid-flight and the row is stranded in 'processing':
-- quota was consumed at insert (consume_quota_on_generation_insert) but the refund
-- trigger only fires on status='failed', so the row never refunds and the customer
-- sees an infinite spinner.
--
-- No reaper existed (migration 0005 covers resets/purges only). This adds one. It is
-- defensive hygiene that closes the pre-existing single-call-hang case too — the
-- fallback just makes it mandatory.
--
-- Detection anchor:
--   * generations: coalesce(processing_at, created_at). processing_at is stamped on claim
--     by the Edge Function; retries re-enter 'processing' and re-stamp, so coalesce uses
--     it (retry-safe). created_at is the FALLBACK only for legacy rows that predate the
--     column (those can't have re-entered processing, so created_at is a valid anchor).
--   * anonymous_attempts: `created_at` — anon is one-shot, never retried, so the row
--     enters 'processing' within ~1s of insert and never re-enters. No new column.
--
-- 5-minute threshold > the 150s wall ⇒ only genuine orphans match. Flipping a
-- generations row to 'failed' fires refund_quota_on_failure (migration 0003).

alter table public.generations add column if not exists processing_at timestamptz;

create or replace function public.reap_stuck_processing()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Authenticated user generations — refund fires via the status='failed' trigger.
  update public.generations
     set status = 'failed',
         error_message = 'reaped: stuck in processing > 5m (Edge timeout)',
         completed_at = now()
   where status = 'processing'
     and coalesce(processing_at, created_at) < now() - interval '5 minutes';

  -- Anonymous trials — no quota/refund, just resolve the row so the poll/page stops.
  update public.anonymous_attempts
     set status = 'failed',
         completed_at = now()
   where status = 'processing'
     and created_at < now() - interval '5 minutes';
end;
$$;

-- Schedule wrapped in a pg_extension guard so `supabase reset` works on a dev stack
-- that hasn't enabled pg_cron — matches 20260527000005_pg_cron.sql + 0016.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'reap_stuck_processing',
      '*/5 * * * *',
      $cron$ select public.reap_stuck_processing() $cron$
    );
  end if;
end $$;

comment on function public.reap_stuck_processing is
  'Fails generations/anonymous_attempts stranded in processing past 5m (Edge wall-timeout orphans), so quota refunds (generations) and the UI resolves. Anchored on processing_at (generations) / created_at (anon).';
