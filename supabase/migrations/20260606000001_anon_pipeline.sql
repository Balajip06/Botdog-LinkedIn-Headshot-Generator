-- Migration 0022 — anonymous-trial pipeline completion + claim-into-account
--
-- Context: the in-card homepage flow lets a logged-out visitor generate ONE
-- free headshot, then sign in to claim it + unlock the weekly free quota. The
-- anon async pipeline was previously a stub (the Edge Function ignored
-- anonymous_attempts). This migration adds the columns + function the completed
-- pipeline needs. The Edge Function gains an anonymous_attempts branch, and a
-- second Database Webhook (table=anonymous_attempts, event=INSERT) must be
-- configured in the Supabase Dashboard pointing at the same edge function URL
-- (see docs/RUNBOOK.md).

-- 1. Persist the uploaded photo + style on the anon attempt so the Edge
--    Function can build the prompt (mirrors generations.input_payload).
alter table public.anonymous_attempts
  add column if not exists input_payload jsonb;

-- 2. Claim bookkeeping — which signed-in user adopted this trial, and when.
alter table public.anonymous_attempts
  add column if not exists claimed_by uuid references public.profiles(id) on delete set null,
  add column if not exists claimed_at timestamptz;

-- 3. A claimed generation imports an already-finished free trial — it must NOT
--    consume quota (the anon trial was the cost). Tag the source attempt.
alter table public.generations
  add column if not exists claimed_from_anon uuid
    references public.anonymous_attempts(id) on delete set null;

-- 4. Quota trigger: re-create the LATEST definition (migration 0023 — VIP +
--    quota_blocked emit + tier_at_generation snapshot) and add a claim
--    short-circuit at the very top. Claimed imports skip the decrement entirely
--    (they were paid as the free anonymous trial) but MUST still set
--    tier_at_generation ('free') because that column is NOT NULL.
create or replace function public.consume_quota_on_generation_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile     public.profiles;
  is_vip_user   boolean;
begin
  -- Claimed anon import — already paid as the free trial, never charge quota.
  -- Tier = 'free' (the anon trial is a free-tier render).
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

-- 5. Claim function — copies a completed, unexpired, unclaimed anon attempt into
--    the user's generations so it appears in /me/creations. Idempotent on
--    (user_id, idempotency_key='claim:<attempt_id>'). Service-role only.
create or replace function public.claim_anonymous_attempt(p_attempt_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_anon   public.anonymous_attempts;
  v_gen_id uuid;
begin
  select * into v_anon from public.anonymous_attempts where id = p_attempt_id for update;

  if v_anon.id is null then return null; end if;
  if v_anon.claimed_by is not null then return null; end if;
  if v_anon.status <> 'completed' or v_anon.output_image_url is null then return null; end if;
  if v_anon.expires_at <= now() then return null; end if;

  insert into public.generations (
    user_id, trend_id, trend_version, idempotency_key, input_payload,
    output_image_url, status, cost_usd, completed_at, claimed_from_anon
  ) values (
    p_user_id, v_anon.trend_id, 1, 'claim:' || v_anon.id::text,
    coalesce(v_anon.input_payload, '{}'::jsonb),
    v_anon.output_image_url, 'completed', v_anon.cost_usd, now(), v_anon.id
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_gen_id;

  update public.anonymous_attempts
     set claimed_by = p_user_id, claimed_at = now()
   where id = p_attempt_id;

  return v_gen_id;
end;
$$;

revoke all on function public.claim_anonymous_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_anonymous_attempt(uuid, uuid) to service_role;

-- 6. SECURITY: `claimed_from_anon` short-circuits the quota trigger, so a client
--    must NOT be able to set it on a direct insert (that would be free, unlimited
--    generations). Only the SECURITY DEFINER claim function (which bypasses RLS)
--    may write it. Re-create the own-insert policy with that guard.
drop policy if exists "generations_own_insert" on public.generations;
create policy "generations_own_insert" on public.generations
  for insert with check (auth.uid() = user_id and claimed_from_anon is null);
