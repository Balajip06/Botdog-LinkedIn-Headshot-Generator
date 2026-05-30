-- Migration 0009 — profiles.acquisition_source (CAC attribution)
--
-- W2 of the sellable-asset plan: an acquirer's diligence pass will ask
-- "where did your paying users come from?". Today the answer is a hand-
-- wave; the only attribution we keep is the in-product `referred_by` peer
-- link. We need a persistent, query-able UTM blob captured at signup so
-- the admin's future CAC-by-channel dashboard (`/admin/acquisition`) can
-- group revenue against the channel that brought the user in.
--
-- Captured by `app/auth/callback/route.ts` on the OAuth/magic-link
-- callback. Shape:
--   {
--     utm_source, utm_medium, utm_campaign,
--     utm_content, utm_term,
--     referrer,            -- request `referer` header
--     landed_at            -- ISO timestamp of the callback hit
--   }
-- All fields nullable (most organic signups will have only `referrer` or
-- nothing at all). Stored as JSONB to avoid schema churn each time
-- marketing invents a new tracking param.
--
-- No RLS change needed — the existing `profiles_self_update` policy
-- already restricts writes to the row owner. The callback runs in the
-- user's session, so it goes through that policy. Service-role admin
-- queries bypass RLS as usual.

alter table public.profiles
  add column if not exists acquisition_source jsonb;

-- GIN index supports JSONB containment lookups (`acquisition_source @>
-- '{"utm_source":"x"}'`) for the per-channel rollup. Partial index keeps
-- it tiny — most rows will stay NULL (organic / pre-launch users) and
-- those don't need to be indexed.
create index if not exists profiles_acquisition_source_idx
  on public.profiles using gin (acquisition_source)
  where acquisition_source is not null;
