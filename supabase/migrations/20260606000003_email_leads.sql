-- Migration 0034 — email_leads capture table
--
-- Context: the in-card funnel asks a logged-out visitor for their email to
-- "get more headshots", then fires a Supabase magic-link OTP. That OTP stores
-- NOTHING until the link is clicked, so emails entered by people who never
-- click are invisible — the business cannot count "clients who entered email".
-- This table records every email submission (best-effort, service-role write),
-- giving the acquisition funnel its stage-3 (email entered) count plus a
-- conversion hook to stage-4 (account created).
--
-- De-dup: ONE row per lower(email) (upsert in the writer), so "emails captured"
-- == row count with no GROUP BY at read time. First-seen created_at is
-- preserved on re-entry (the writer does not bump it). Service-role only,
-- mirroring anonymous_attempts (the id is not a capability here — admin reads
-- via service-role).

create extension if not exists pgcrypto;

create table if not exists public.email_leads (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  email_hash        text generated always as (encode(digest(lower(email), 'sha256'), 'hex')) stored,
  source            text not null default 'inline' check (source in ('inline', 'login')),
  attempt_id        uuid references public.anonymous_attempts(id) on delete set null,
  next_path         text,
  created_at        timestamptz not null default now(),
  converted_user_id uuid references public.profiles(id) on delete set null,
  converted_at      timestamptz
);

create unique index if not exists email_leads_email_key on public.email_leads (lower(email));
create index if not exists email_leads_created_at_idx on public.email_leads (created_at);
create index if not exists email_leads_converted_idx on public.email_leads (converted_user_id)
  where converted_user_id is not null;

-- Service-role only: enable RLS with no policies (deny-all to anon/authenticated;
-- service-role bypasses RLS). Matches anonymous_attempts.
alter table public.email_leads enable row level security;
revoke all on public.email_leads from anon, authenticated;
