-- Migration 0028 — Refund the correct quota type on terminal failure
--
-- Red-team LOW L2: `refund_quota_on_failure` in migration 0003 chose
-- which counter to refund based on whichever was non-zero at refund
-- time, preferring `free_used_this_week`. A user with credits >= 1 AND
-- free_used_this_week >= 1 who triggered a paid generation that later
-- failed would get the refund applied to the free counter — leaving
-- their credit balance permanently down by 1.
--
-- The fix relies on migration 0022 (`tier_at_generation` on each
-- generation row), which now snapshots which branch consumed the quota.
-- The refund trigger reads that snapshot and restores the matching
-- counter. VIP rows are skipped — VIPs never consumed quota.

create or replace function public.refund_quota_on_failure()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'failed' and old.status is distinct from 'failed' then
    if new.tier_at_generation = 'credit' then
      update public.profiles
         set credits_balance = credits_balance + 1
       where id = new.user_id;
    elsif new.tier_at_generation = 'free' then
      update public.profiles
         set free_used_this_week = greatest(free_used_this_week - 1, 0)
       where id = new.user_id;
    end if;
    -- 'vip' rows: nothing to refund. The Gemini cost stays attributed
    -- to the VIP on the row's cost_usd column for margin tracking.
  end if;
  return new;
end;
$$;
