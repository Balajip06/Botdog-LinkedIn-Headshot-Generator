-- Migration 0033 — Recurring "Botdog plan" subscription
--
-- Context: the funnel upsell ("the Botdog plan") becomes a real recurring
-- Stripe subscription ($9/mo). One-time credit packs stay wired as backend
-- (admin grants, referrals, extra top-ups). A subscription grants a MONTHLY
-- ALLOWANCE (default 200 generations) modeled as a per-period counter
-- (sub_used_this_period vs sub_allowance) — exactly like free_used_this_week.
-- This means the allowance:
--   * auto-resets each billing period (webhook invoice.paid -> reset_usage),
--   * never STACKS (unused does not roll over),
--   * stays INDEPENDENT of credits_balance (pack/referral/admin credits remain
--     additive and survive renewal).
-- Quota branch order becomes: claimed-anon -> VIP -> subscription allowance ->
-- credit -> free -> blocked.

-- 1. New generation tier. `alter type ... add value` must NOT be used in the
--    same transaction in which it is referenced in DML; here it is only
--    referenced inside plpgsql function bodies (stored as text, evaluated at
--    call time), so a single migration file is safe.
alter type public.generation_tier add value if not exists 'subscription';

-- 2. Subscription state on profiles. All written ONLY by the service-role
--    webhook via set_subscription_state(); locked from client self-update (§6).
alter table public.profiles
  add column if not exists stripe_customer_id      text,
  add column if not exists subscription_id         text,
  add column if not exists subscription_status     text
    check (subscription_status in ('active', 'past_due', 'canceled')),
  add column if not exists subscription_period_end timestamptz,
  add column if not exists sub_allowance           int not null default 200,
  add column if not exists sub_used_this_period    int not null default 0;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
create index if not exists profiles_active_sub_idx
  on public.profiles (subscription_status) where subscription_status = 'active';

-- 3. set_subscription_state — service-role-only writer (mirrors grant_credits).
--    p_reset_usage=true on checkout + each invoice.paid renewal (the monthly
--    refresh that prevents stacking). Writes an audit row.
create or replace function public.set_subscription_state(
  p_user_id         uuid,
  p_status          text,
  p_period_end      timestamptz,
  p_customer_id     text,
  p_subscription_id text,
  p_reset_usage     boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set subscription_status     = p_status,
         subscription_period_end = coalesce(p_period_end, subscription_period_end),
         stripe_customer_id      = coalesce(p_customer_id, stripe_customer_id),
         subscription_id         = coalesce(p_subscription_id, subscription_id),
         sub_used_this_period    = case when p_reset_usage then 0 else sub_used_this_period end
   where id = p_user_id
     and deleted_at is null;

  if not found then
    raise exception 'set_subscription_state: profile % not found or deleted', p_user_id;
  end if;

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, after)
  values (
    null,
    'subscription_change',
    'profiles',
    p_user_id::text,
    jsonb_build_object(
      'status', p_status,
      'period_end', p_period_end,
      'subscription_id', p_subscription_id,
      'reset_usage', p_reset_usage
    )
  );
end;
$$;

revoke all on function public.set_subscription_state(uuid, text, timestamptz, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.set_subscription_state(uuid, text, timestamptz, text, text, boolean)
  to service_role;

-- 4. Quota trigger — recreate the LATEST definition (migration 0022 anon
--    pipeline: claimed short-circuit + VIP + quota_blocked emit + tier
--    snapshot) and add the subscription-allowance branch as the FIRST
--    condition of the post-lock chain. Subscriber who exhausts the monthly
--    allowance falls through to credits -> free -> blocked.
create or replace function public.consume_quota_on_generation_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile     public.profiles;
  is_vip_user   boolean;
begin
  -- Claimed anon import — already paid as the free trial, never charge quota.
  if new.claimed_from_anon is not null then
    new.tier_at_generation := 'free';
    return new;
  end if;

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

  if v_profile.subscription_status = 'active'
     and v_profile.subscription_period_end > now()
     and v_profile.sub_used_this_period < v_profile.sub_allowance then
    update public.profiles set sub_used_this_period = sub_used_this_period + 1 where id = new.user_id;
    new.tier_at_generation := 'subscription';
  elsif v_profile.credits_balance > 0 then
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

-- 5. Refund trigger — recreate the LATEST definition (migration 0028: refund
--    by tier snapshot) + a subscription branch that gives back one allowance unit.
create or replace function public.refund_quota_on_failure()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'failed' and old.status is distinct from 'failed' then
    if new.tier_at_generation = 'subscription' then
      update public.profiles
         set sub_used_this_period = greatest(sub_used_this_period - 1, 0)
       where id = new.user_id;
    elsif new.tier_at_generation = 'credit' then
      update public.profiles
         set credits_balance = credits_balance + 1
       where id = new.user_id;
    elsif new.tier_at_generation = 'free' then
      update public.profiles
         set free_used_this_week = greatest(free_used_this_week - 1, 0)
       where id = new.user_id;
    end if;
    -- 'vip' rows: nothing to refund (cost stays on cost_usd for margin).
  end if;
  return new;
end;
$$;

-- 6. Purge trigger — recreate to key off the tier snapshot (set by the quota
--    trigger, which runs first: 'generations_consume_quota' sorts before
--    'generations_set_purge'). Paid tiers (credit/vip/subscription) keep their
--    output forever; free expires in 30 days. Fixes the prior credits_balance
--    read, which would have mis-expired a subscriber holding 0 credits.
create or replace function public.set_generation_purge_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tier_at_generation in ('credit', 'vip', 'subscription') then
    new.purge_at := null;  -- paid = forever
  else
    new.purge_at := now() + interval '30 days';
  end if;
  return new;
end;
$$;

-- 7. SECURITY — the subscription columns gate unlimited(-ish) generations, so a
--    client must NOT be able to self-set them. Recreate the self-update
--    lockdown (migration 0032) adding the new columns to the locked set.
create or replace function public.enforce_profiles_self_update_lockdown()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if v_actor is null then
    return new;
  end if;
  if v_actor <> old.id then
    return new;
  end if;

  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'profiles_self_update: cannot clear deleted_at'
      using errcode = 'check_violation';
  end if;
  if old.tos_accepted_at is not null and new.tos_accepted_at is null then
    raise exception 'profiles_self_update: cannot clear tos_accepted_at'
      using errcode = 'check_violation';
  end if;

  if new.id                              is distinct from old.id                              then raise exception 'profiles_self_update: id is locked'                              using errcode = 'check_violation'; end if;
  if new.email                           is distinct from old.email                           then raise exception 'profiles_self_update: email is locked'                           using errcode = 'check_violation'; end if;
  if new.credits_balance                 is distinct from old.credits_balance                 then raise exception 'profiles_self_update: credits_balance is locked'                 using errcode = 'check_violation'; end if;
  if new.free_used_this_week             is distinct from old.free_used_this_week             then raise exception 'profiles_self_update: free_used_this_week is locked'             using errcode = 'check_violation'; end if;
  if new.free_week_starts_at             is distinct from old.free_week_starts_at             then raise exception 'profiles_self_update: free_week_starts_at is locked'             using errcode = 'check_violation'; end if;
  if new.referral_code                   is distinct from old.referral_code                   then raise exception 'profiles_self_update: referral_code is locked'                   using errcode = 'check_violation'; end if;
  if new.bonus_credits_earned            is distinct from old.bonus_credits_earned            then raise exception 'profiles_self_update: bonus_credits_earned is locked'            using errcode = 'check_violation'; end if;
  if new.created_at                      is distinct from old.created_at                      then raise exception 'profiles_self_update: created_at is locked'                      using errcode = 'check_violation'; end if;
  if new.is_vip                          is distinct from old.is_vip                          then raise exception 'profiles_self_update: is_vip is locked'                          using errcode = 'check_violation'; end if;
  if new.vip_reason                      is distinct from old.vip_reason                      then raise exception 'profiles_self_update: vip_reason is locked'                      using errcode = 'check_violation'; end if;
  if new.vip_granted_by                  is distinct from old.vip_granted_by                  then raise exception 'profiles_self_update: vip_granted_by is locked'                  using errcode = 'check_violation'; end if;
  if new.vip_granted_at                  is distinct from old.vip_granted_at                  then raise exception 'profiles_self_update: vip_granted_at is locked'                  using errcode = 'check_violation'; end if;
  if new.first_purchase_discount_used_at is distinct from old.first_purchase_discount_used_at then raise exception 'profiles_self_update: first_purchase_discount_used_at is locked' using errcode = 'check_violation'; end if;
  if new.referred_by                     is distinct from old.referred_by                     then raise exception 'profiles_self_update: referred_by is locked'                     using errcode = 'check_violation'; end if;
  if new.stripe_customer_id              is distinct from old.stripe_customer_id              then raise exception 'profiles_self_update: stripe_customer_id is locked'              using errcode = 'check_violation'; end if;
  if new.subscription_id                 is distinct from old.subscription_id                 then raise exception 'profiles_self_update: subscription_id is locked'                 using errcode = 'check_violation'; end if;
  if new.subscription_status             is distinct from old.subscription_status             then raise exception 'profiles_self_update: subscription_status is locked'             using errcode = 'check_violation'; end if;
  if new.subscription_period_end         is distinct from old.subscription_period_end         then raise exception 'profiles_self_update: subscription_period_end is locked'         using errcode = 'check_violation'; end if;
  if new.sub_allowance                   is distinct from old.sub_allowance                   then raise exception 'profiles_self_update: sub_allowance is locked'                   using errcode = 'check_violation'; end if;
  if new.sub_used_this_period            is distinct from old.sub_used_this_period            then raise exception 'profiles_self_update: sub_used_this_period is locked'            using errcode = 'check_violation'; end if;

  return new;
end;
$$;
