-- Migration 0020 — Lock down `profiles_self_update` RLS policy
--
-- Red-team audit (2026-05-30) confirmed CRITICAL: the prior WITH CHECK clause
-- only validated `auth.uid() = id`, `deleted_at IS NULL`, and tos_accepted_at
-- monotonicity. It did NOT column-restrict writes, so any authenticated user
-- could issue:
--   update profiles set is_vip = true        where id = auth.uid();
--   update profiles set credits_balance = 99 where id = auth.uid();
--   update profiles set free_used_this_week = 0 where id = auth.uid();
-- via the Supabase JS client and bypass every quota/credit invariant — the
-- generations INSERT trigger is moot if the attacker never inserts.
--
-- This migration replaces the policy with an explicit column allowlist by
-- comparing each sensitive column's post-image to its pre-image value (read
-- via subquery against the same row). Users may write only:
--   - name, avatar_url, push_subscription, tos_accepted_at,
--     acquisition_source, deleted_at (null → timestamp, the soft-delete path)
-- Everything else must equal the pre-image. Service-role bypasses RLS, so
-- legitimate server-side credit / VIP / quota mutations remain unaffected.
--
-- Side effect: the prior WITH CHECK required `deleted_at IS NULL` on the
-- post-image, which silently broke `softDeleteAccount` in
-- app/(app)/me/settings/page.tsx (the call ran via the anon-key SSR client
-- and was rejected by RLS with no error surfaced — `softDeleteAccount`
-- ignores the `error` field). The new policy permits the null→timestamp
-- transition but blocks resurrecting (timestamp→null) and stays compatible
-- with the existing tos_accepted_at monotonicity guard from migration 0007.

drop policy if exists "profiles_self_update" on public.profiles;

create policy "profiles_self_update" on public.profiles
  for update
  using (auth.uid() = id and deleted_at is null)
  with check (
    auth.uid() = id
    -- deleted_at: allow null → non-null (soft-delete), block non-null → null
    and (
      deleted_at is null
      or (select p.deleted_at from public.profiles p where p.id = auth.uid()) is null
      or deleted_at = (select p.deleted_at from public.profiles p where p.id = auth.uid())
    )
    -- tos_accepted_at: once stamped, cannot be cleared (monotonic) — preserves
    -- migration 0007 guarantee
    and (
      tos_accepted_at is not null
      or (select p.tos_accepted_at from public.profiles p where p.id = auth.uid()) is null
    )
    -- Locked columns: post-image MUST equal pre-image. Any attempt to mutate
    -- these via the authenticated role is rejected by RLS.
    and id                              = (select p.id                              from public.profiles p where p.id = auth.uid())
    and email                           = (select p.email                           from public.profiles p where p.id = auth.uid())
    and credits_balance                 = (select p.credits_balance                 from public.profiles p where p.id = auth.uid())
    and free_used_this_week             = (select p.free_used_this_week             from public.profiles p where p.id = auth.uid())
    and free_week_starts_at             = (select p.free_week_starts_at             from public.profiles p where p.id = auth.uid())
    and referral_code                   = (select p.referral_code                   from public.profiles p where p.id = auth.uid())
    and bonus_credits_earned            = (select p.bonus_credits_earned            from public.profiles p where p.id = auth.uid())
    and created_at                      = (select p.created_at                      from public.profiles p where p.id = auth.uid())
    and is_vip                          = (select p.is_vip                          from public.profiles p where p.id = auth.uid())
    and vip_reason                  is not distinct from (select p.vip_reason       from public.profiles p where p.id = auth.uid())
    and vip_granted_by              is not distinct from (select p.vip_granted_by   from public.profiles p where p.id = auth.uid())
    and vip_granted_at              is not distinct from (select p.vip_granted_at   from public.profiles p where p.id = auth.uid())
    and first_purchase_discount_used_at is not distinct from (select p.first_purchase_discount_used_at from public.profiles p where p.id = auth.uid())
    -- referred_by: locked once set. The signup path runs via service-role in
    -- handle_new_user → no anon-client write is needed.
    and referred_by                 is not distinct from (select p.referred_by      from public.profiles p where p.id = auth.uid())
  );

comment on policy "profiles_self_update" on public.profiles is
  'Self-update RLS: explicit column allowlist. Users may write only name/avatar_url/push_subscription/tos_accepted_at/acquisition_source and soft-delete via deleted_at. All credit/quota/VIP/referral columns are pre-image-equality-locked. Service-role bypasses RLS for legitimate server-side mutations.';
