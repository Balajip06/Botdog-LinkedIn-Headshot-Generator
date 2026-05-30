-- Migration 0015 — quota trigger: VIP short-circuit + quota_blocked emit
--
-- Two behaviors land in the same migration because they're both edits to
-- the same `consume_quota_on_generation_insert` function, which sits on
-- the hot path of every generation insert. Testing them separately would
-- mean two atomic transitions of the function definition on a code path
-- that's exercised every time a user hits "generate" — combining them
-- keeps the at-risk window to a single transaction.
--
-- A) VIP short-circuit — VIPs bypass quota but still incur cost.
--    Important invariant: we return BEFORE the decrement path runs, but
--    AFTER the row has been validated. `generations.cost_usd` is still
--    written by the Edge Function on the completion path, so margin
--    dashboards continue to attribute the Gemini cost to the VIP user —
--    we are NOT giving away free margin, we are giving away free quota.
--
-- B) quota_blocked emit — we now write a `trend_events` row before
--    raising 'quota exhausted'. This lets /admin/engagement show the
--    "how often did the paywall fire" funnel, which is the leading
--    indicator for the conversion-rate work in the sellable plan. The
--    INSERT happens inside the same transaction as the RAISE, so a
--    failed quota check is atomically logged-and-rejected (no partial
--    state). `trend_events.type` previously had a CHECK constraint that
--    only allowed 'impression' | 'click_generate' — we drop and recreate
--    it to include 'quota_blocked' in the same migration so the new
--    INSERT cannot fire before the constraint accepts it.

alter table public.trend_events drop constraint if exists trend_events_type_check;
alter table public.trend_events add constraint trend_events_type_check
  check (type in ('impression', 'click_generate', 'quota_blocked'));

create or replace function public.consume_quota_on_generation_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile     public.profiles;
  is_vip_user   boolean;
begin
  -- VIPs bypass quota but still incur Gemini cost — early RETURN before
  -- the decrement step, after computing the row identity but before any
  -- writes against profiles. Cost-still-recorded invariant: the Edge
  -- Function writes `generations.cost_usd` on the completion path, so
  -- margin dashboards continue to attribute Gemini spend to VIPs.
  select is_vip into is_vip_user from public.profiles where id = new.user_id;
  if is_vip_user is true then
    return new;
  end if;

  select * into v_profile from public.profiles where id = new.user_id for update;

  if v_profile.deleted_at is not null then
    raise exception 'profile deleted';
  end if;

  if v_profile.credits_balance > 0 then
    update public.profiles set credits_balance = credits_balance - 1 where id = new.user_id;
  elsif v_profile.free_used_this_week < 5 then
    update public.profiles set free_used_this_week = free_used_this_week + 1 where id = new.user_id;
  else
    -- Emit a `quota_blocked` event before the RAISE so /admin/engagement
    -- can render the paywall-hit funnel. Same transaction as the RAISE,
    -- so a rolled-back insert also rolls back the event row — no false
    -- positives.
    insert into public.trend_events (trend_slug, type, occurred_at)
    select t.slug, 'quota_blocked', now()
      from public.trends t where t.id = new.trend_id;

    raise exception 'quota exhausted';
  end if;

  return new;
end;
$$;
