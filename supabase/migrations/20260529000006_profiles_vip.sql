-- Migration 0012 — profiles VIP grant columns
--
-- VIPs (influencers, creator partners, early-access users) bypass the
-- weekly free-tier quota but still incur `generations.cost_usd` so the
-- margin dashboards stay honest. Used by the W2 creator-outreach
-- acquisition channel — when we comp a TikTok account in exchange for
-- a demo video, that account becomes a VIP and the unlimited tier is
-- the leverage. The cost row keeps us from kidding ourselves about CAC.
--
-- All four columns are nullable / default-safe so the migration is a
-- pure additive change. `vip_granted_by` references profiles(id) so the
-- audit trail can resolve who comped whom; it stays nullable for
-- system-granted (early-access cohort) rows.
--
-- No RLS change is needed. The existing `profiles_self_update` policy
-- already prevents a user from self-granting VIP because the user's own
-- JWT cannot satisfy a policy that requires writing `vip_granted_by` to
-- a different profile's id — VIP grants must go through the service-role
-- admin path (see `app/admin/vip/actions.ts`).

alter table public.profiles
  add column if not exists is_vip          boolean not null default false,
  add column if not exists vip_reason      text,
  add column if not exists vip_granted_by  uuid references public.profiles(id),
  add column if not exists vip_granted_at  timestamptz;

-- Partial index — vast majority of rows are non-VIP; only index the
-- handful we'll list on /admin/vip.
create index if not exists profiles_vip_idx
  on public.profiles(id) where is_vip = true;
