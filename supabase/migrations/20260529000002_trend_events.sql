-- Migration 0008 — trend_events (real analytics persistence)
--
-- W1 of the sellable-asset plan: replace the in-memory `event-store.ts`
-- Map (resets on every server restart, populated with deterministic mock
-- baseline) with a persistent append-only event log. A buyer's diligence
-- query against `webhook_events`-style aggregates must return real numbers
-- — an in-memory store is a credibility-bomb mid-process.
--
-- Schema is deliberately denormalized: stores `trend_slug` rather than
-- `trend_id`. The `/api/track` endpoint accepts slug from the client (the
-- public surface uses slug as the stable identifier — see
-- `lib/analytics/event-store.ts`), and the dashboards likewise key on
-- slug. Skipping the slug→id join keeps inserts fast and avoids a
-- per-event extra query on every page view.
--
-- Append-only: no updates, no soft-delete. Aggregate via SQL count() at
-- read time. Daily series materializes via `date_trunc('day', occurred_at)`
-- group-by (see `event-store.ts` `getDailySeries`).

create table public.trend_events (
  id          bigserial primary key,
  trend_slug  text not null,
  type        text not null check (type in ('impression', 'click_generate')),
  occurred_at timestamptz not null default now()
);

-- (slug, occurred_at) is the dominant access path: per-slug daily counts +
-- recent-period totals both filter by slug and bucket by day. Composite
-- index gives a covering scan in the common case.
create index trend_events_slug_occurred_idx
  on public.trend_events (trend_slug, occurred_at desc);

create index trend_events_occurred_at_idx
  on public.trend_events (occurred_at desc);

create index trend_events_type_idx
  on public.trend_events (type);

alter table public.trend_events enable row level security;

-- Service role only. Anonymous + authenticated users both call /api/track,
-- which uses the service-role client. No auth.uid means no read policy is
-- exposed to the client — admin dashboards read via service role as well.
