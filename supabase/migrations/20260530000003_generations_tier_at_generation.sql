-- Migration 0022 — persist tier at generation time on `generations`
--
-- Red-team audit CRITICAL C2: the watermark gate in /api/download/[id]
-- read `profile.credits_balance > 0` at download time. This is wrong on
-- both branches:
--   - A paid generation whose credits were since spent gets re-watermarked
--     even though the user paid for the clean version (lost trust).
--   - A free generation owned by a user who later bought credits comes
--     out clean (free user keeps an unwatermarked image from the free
--     tier, defeating the upsell).
-- Race window: even within a single session, `credits_balance` is read
-- non-transactionally and after the quota trigger has decremented, so a
-- generate-then-immediate-download flow saw a stale balance.
--
-- Fix: snapshot the tier at INSERT time onto the generation row itself.
-- The download endpoint then reads `gen.tier_at_generation` directly —
-- no second profile lookup, no race, no stale read. Snapshot value is
-- whatever branch the quota trigger took: 'credit' / 'free' / 'vip'.
-- 'vip' is treated as clean (Pro-equivalent) for download.

create type public.generation_tier as enum ('free', 'credit', 'vip');

alter table public.generations
  add column if not exists tier_at_generation public.generation_tier;

-- Backfill: any existing row with cost_usd > 0 is treated as 'credit'
-- (closest historical approximation; refunded rows already set cost back
-- to 0). Free rows fall through.
update public.generations
   set tier_at_generation = 'credit'
 where tier_at_generation is null and cost_usd > 0;

update public.generations
   set tier_at_generation = 'free'
 where tier_at_generation is null;

alter table public.generations
  alter column tier_at_generation set not null;

-- Update the quota trigger to record which branch consumed the
-- generation. Same shape as migration 0015 (VIP + quota_blocked emit) —
-- we add a single `new.tier_at_generation := …` assignment per branch.
-- The function stays SECURITY DEFINER with `set search_path = public`
-- per the project-wide trigger convention.
create or replace function public.consume_quota_on_generation_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile     public.profiles;
  is_vip_user   boolean;
begin
  -- VIP branch: bypass quota, still incur cost. Tier = 'vip'.
  select is_vip into is_vip_user from public.profiles where id = new.user_id;
  if is_vip_user is true then
    new.tier_at_generation := 'vip';
    return new;
  end if;

  select * into v_profile from public.profiles where id = new.user_id for update;

  if v_profile.deleted_at is not null then
    raise exception 'profile deleted';
  end if;

  if v_profile.credits_balance > 0 then
    update public.profiles set credits_balance = credits_balance - 1 where id = new.user_id;
    new.tier_at_generation := 'credit';
  elsif v_profile.free_used_this_week < 5 then
    update public.profiles set free_used_this_week = free_used_this_week + 1 where id = new.user_id;
    new.tier_at_generation := 'free';
  else
    insert into public.trend_events (trend_slug, type, occurred_at)
    select t.slug, 'quota_blocked', now()
      from public.trends t where t.id = new.trend_id;

    raise exception 'quota exhausted';
  end if;

  return new;
end;
$$;

comment on column public.generations.tier_at_generation is
  'Snapshot of which quota branch consumed this generation: free/credit/vip. Read at download time to decide watermark — never re-derive from live profile state.';
