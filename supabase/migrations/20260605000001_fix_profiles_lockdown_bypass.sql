-- Migration 0032 — Fix profiles_self_update_lockdown bypass for SECURITY DEFINER triggers
--
-- Root cause: auth.uid() returns the session JWT claim even inside a
-- SECURITY DEFINER function (SECURITY DEFINER changes the DB execution role,
-- not the JWT session context). So consume_quota_on_generation_insert,
-- refund_quota_on_failure, and grant_credits — all SECURITY DEFINER — were
-- blocked by enforce_profiles_self_update_lockdown because auth.uid() was
-- non-null (set by the original client request).
--
-- Fix: bypass when current_user is a privileged DB role. These roles only
-- execute under SECURITY DEFINER triggers/functions initiated by the server,
-- never via a raw client JWT path.

create or replace function public.enforce_profiles_self_update_lockdown()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
begin
  -- Bypass for service-role / SECURITY DEFINER callers.
  -- current_user is the DB role executing this function; authenticated client
  -- sessions run as 'authenticated' or 'anon'. Privileged system roles
  -- (postgres, supabase_admin, service_role) only appear when the call
  -- originates from a SECURITY DEFINER function or the Supabase service key.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  -- Also bypass when auth.uid() is null (legacy path kept for safety).
  if v_actor is null then
    return new;
  end if;

  -- Only enforce when the user is mutating THEIR OWN row.
  if v_actor <> old.id then
    return new;
  end if;

  -- deleted_at: allow null → timestamp (user soft-delete) or unchanged;
  -- reject timestamp → null (self-resurrect).
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'profiles_self_update: cannot clear deleted_at'
      using errcode = 'check_violation';
  end if;

  -- tos_accepted_at: monotonic. Once stamped, cannot be nulled.
  if old.tos_accepted_at is not null and new.tos_accepted_at is null then
    raise exception 'profiles_self_update: cannot clear tos_accepted_at'
      using errcode = 'check_violation';
  end if;

  -- Locked columns (client-side mutations rejected).
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

  return new;
end;
$$;

comment on function public.enforce_profiles_self_update_lockdown is
  'Column-allowlist enforcement for authenticated client updates to profiles. Bypasses for service-role / SECURITY DEFINER callers (current_user check) so quota triggers (consume_quota_on_generation_insert, refund_quota_on_failure, grant_credits) can update locked columns freely.';
