-- Stores the set of trend IDs a user has bookmarked from the studio grid.
-- Kept as a jsonb array on profiles to avoid a join table for a simple set.
alter table public.profiles
  add column if not exists favourite_trend_ids uuid[] not null default '{}';

-- Allow users to read/update their own favourite_trend_ids via the existing
-- profiles_self_update trigger path — no extra policy needed; the column is
-- covered by the existing UPDATE policy on profiles (owner row).
