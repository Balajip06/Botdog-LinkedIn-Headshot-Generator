-- Migration 0026 — Persistent referral rewards ledger
--
-- Red-team MEDIUM M6: `referrals.referred_id` UNIQUE prevents one referee
-- from triggering multiple rewards while their row exists. But when the
-- GDPR soft-delete purge runs (pg_cron, 30-day TTL on profiles.deleted_at),
-- the entire profile row is removed and ON DELETE CASCADE wipes the
-- referrals row with it. If the same person re-signs up later (new
-- auth.users.id, same email or even a different one), they can be
-- referred again by the same referrer — the unique constraint sees a
-- clean slate.
--
-- Combined with the bonus_credits_earned cap of 50 (5 referrals), the
-- ceiling is bounded but a determined attacker can cycle every 30 days.
--
-- Fix: add a separate `referral_rewards` table that:
--   - Is NOT cascade-deleted when referrer or referee profile is deleted.
--   - Records (referrer_id, referee_email_hash) at reward time. Email
--     hash is SHA-256 to avoid PII pile-up in the ledger.
--   - Has a UNIQUE constraint on (referrer_id, referee_email_hash) so
--     the same referrer cannot earn a reward twice for the same human,
--     even after a profile cycle.
--   - Survives ON DELETE SET NULL of `referrer_id` (we keep the row for
--     the email-hash uniqueness check; referrer_id can be null if the
--     referrer themself was GDPR-purged).
--
-- The check fires inside the reward branch of maybe_reward_referral.
-- If a row already exists for (referrer_id, referee_email_hash), we
-- skip the credits + bonus update — the referrals row is still marked
-- 'rewarded' so the funnel emits REFERRAL_REDEEMED (which is still a
-- legitimate signup), but no fresh credits are granted.

create table if not exists public.referral_rewards (
  id                  uuid primary key default gen_random_uuid(),
  referrer_id         uuid references public.profiles(id) on delete set null,
  referee_email_hash  text not null,
  rewarded_at         timestamptz not null default now(),
  -- Bind to a referrals row when one still exists; allow null so the
  -- ledger survives the cascade-delete of the original referrals row.
  source_referral_id  uuid references public.referrals(id) on delete set null,
  unique (referrer_id, referee_email_hash)
);

create index referral_rewards_referrer_idx on public.referral_rewards(referrer_id);
create index referral_rewards_email_hash_idx on public.referral_rewards(referee_email_hash);

alter table public.referral_rewards enable row level security;
-- Service-role only — no read/write policy. Admin queries via service-role.

-- Encode email → deterministic SHA-256 hex. Plpgsql wrapper so the
-- trigger can call it without depending on extensions beyond pgcrypto
-- (already enabled in migration 0001).
create or replace function public.email_to_hash(p_email text)
returns text language sql immutable security definer set search_path = public as $$
  select encode(digest(lower(trim(p_email)), 'sha256'), 'hex');
$$;

-- Replace maybe_reward_referral with the ledger-guarded version. Same
-- shape as migration 0004; only the inside of the `if found` branch
-- changes. Trigger binding is preserved (no DROP TRIGGER needed since
-- CREATE OR REPLACE on the function picks up automatically).
create or replace function public.maybe_reward_referral()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ref         public.referrals;
        v_prior       int;
        v_email_hash  text;
        v_already     int;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    select count(*) into v_prior
      from public.generations
      where user_id = new.user_id and status = 'completed' and id <> new.id;
    if v_prior = 0 then
      select * into v_ref from public.referrals
        where referred_id = new.user_id and status = 'pending'
        for update;
      if found then
        -- Look up the referee's email to compute its hash for the ledger
        -- uniqueness check. Profiles may already be soft-deleted on a
        -- delete+recreate flow, in which case the email is still
        -- present (deleted_at gates `profiles_self_read` for the user,
        -- not the service-role trigger).
        select email_to_hash(email) into v_email_hash
          from public.profiles where id = new.user_id;

        select count(*) into v_already
          from public.referral_rewards
         where referrer_id = v_ref.referrer_id
           and referee_email_hash = v_email_hash;

        -- Always mark the referral row as rewarded so the
        -- REFERRAL_REDEEMED analytics event fires (signup completed).
        -- But only grant credits if this email has not been rewarded
        -- before for this referrer — closes the delete-and-recreate
        -- farming cycle (red-team M6).
        update public.referrals set status = 'rewarded', rewarded_at = now() where id = v_ref.id;

        if v_already = 0 then
          insert into public.referral_rewards (referrer_id, referee_email_hash, source_referral_id)
          values (v_ref.referrer_id, v_email_hash, v_ref.id);

          update public.profiles
            set credits_balance       = credits_balance + 10,
                bonus_credits_earned  = least(bonus_credits_earned + 10, 50)
            where id = v_ref.referrer_id
              and bonus_credits_earned < 50;
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

comment on table public.referral_rewards is
  'Persistent ledger of referral payouts keyed on (referrer_id, sha256(referee email)). Survives profile deletion so a re-registered email cannot trigger a second reward to the same referrer.';
