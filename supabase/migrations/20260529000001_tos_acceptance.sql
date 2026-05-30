-- Migration 0007 — Terms-of-Service acceptance tracking
--
-- W0 of the sellable-asset plan: explicit clickwrap acceptance is required
-- for any acquirer's IP-risk review of the consumer-facing trend prompts
-- (`docs/TERMS_OF_SERVICE.md` §3 personal-use + §4 takedown protocol).
--
-- Column is nullable so existing rows survive — `handle_new_user` cannot
-- access the form payload, so we stamp `tos_accepted_at` from the
-- post-callback path (`app/auth/callback/route.ts`) after the OAuth /
-- magic-link exchange completes. Once stamped, RLS prevents the user from
-- clearing it again.

alter table public.profiles
  add column if not exists tos_accepted_at timestamptz;

create index if not exists profiles_tos_accepted_at_idx
  on public.profiles (tos_accepted_at)
  where tos_accepted_at is null;

-- Block users from clearing their own acceptance once recorded. New WITH
-- CHECK: any update that nulls the stamp is rejected (the existing
-- `profiles_self_update` policy only checked deleted_at).
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id and deleted_at is null)
  with check (
    auth.uid() = id
    and deleted_at is null
    -- Once accepted, the timestamp can't be reset to NULL by the user.
    and (tos_accepted_at is not null or (select tos_accepted_at from public.profiles where id = auth.uid()) is null)
  );
