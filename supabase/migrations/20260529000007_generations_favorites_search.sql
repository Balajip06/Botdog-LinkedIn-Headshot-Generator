-- Migration 0013 — generations favorites + full-text search
--
-- Favorites are the W3 retention lever in the sellable-asset plan: a
-- lightweight "star" affordance on /me/creations gives free-tier users
-- a reason to come back and inspect their best generations after the
-- 30-day purge clock would otherwise erase the row. Pro users (forever
-- storage) get a curation surface for shareable hits.
--
-- Full-text search supports the /me/creations search bar. A GIN index
-- over `to_tsvector('simple', input_payload::text)` lets users grep
-- their own library by the literal text they typed into schema fields
-- (e.g. "samurai" or "cyberpunk"). 'simple' dictionary keeps it
-- language-agnostic and stemming-free, which matches the noisy short
-- inputs users actually type. Revisit if user libraries exceed ~10k
-- rows per user — the GIN scan is still fast at that scale but the
-- index size starts mattering. Acceptable for the $50–75K listing
-- target where median library size is two-digit.
--
-- No RLS change — the existing `generations_own_read` policy already
-- gates SELECT to `auth.uid() = user_id`, so the new columns + index
-- inherit the same gate. `is_favorite` is user-writable via the
-- existing `generations_own_update_share` policy (which only restricts
-- WITH CHECK to the row owner — there is no column-level grant
-- separating share from favorite).

alter table public.generations
  add column if not exists is_favorite  boolean not null default false,
  add column if not exists favorited_at timestamptz;

-- Partial index — most rows are not favorited; index only the rows that
-- are, ordered by recency for the /me/creations "Favorites" tab.
create index if not exists gens_user_favorite_idx
  on public.generations(user_id, favorited_at desc) where is_favorite = true;

-- GIN over input_payload text — supports `/me/creations` search bar.
-- coalesce() guards against the (theoretical) null payload; the column
-- itself is NOT NULL but ::text on jsonb can surface edge-case nulls
-- in older fixtures.
create index if not exists gens_user_search_idx
  on public.generations using gin (to_tsvector('simple', coalesce(input_payload::text, '')));
