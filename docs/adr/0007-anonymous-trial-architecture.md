# ADR 7: Anonymous trial gated by `(fingerprint_hash, ip_hash)` UNIQUE + daily abuse budget

Date: 2026-05-29
Status: Accepted

## Context

Conversion data on consumer image-gen products shows a ~10x lift in trial→signup conversion when users can see a generation *before* being asked to authenticate. The "try one before you sign up" anonymous trial is therefore central to the funnel.

But anonymous = no auth.uid = the standard quota mechanism (ADR 2) doesn't apply. The risk classes:

1. **Cost runaway**: each Gemini call costs ~$0.03–0.05. An untrottled anonymous endpoint is a $1000+/day potential drain.
2. **Abuse**: a single attacker farming the free generation by rotating IPs / browsers / VPNs.
3. **Account dodging**: legitimate users repeatedly using the anonymous flow instead of converting.

The constraints from the amended plan:
- One free try per device, lifetime (not per day, not per week).
- Daily global spend cap on the anonymous flow as a circuit breaker.
- Turnstile CAPTCHA before any work happens.
- The trial result viewable via a public URL (anyone with the link sees it) but `robots: noindex` so it doesn't pollute the search index.

## Decision

Two-key uniqueness, two-layer budget, server-side Turnstile.

**Schema** (see [supabase/migrations/20260527000004_ancillary.sql](../../supabase/migrations/20260527000004_ancillary.sql)):

```sql
create table public.anonymous_attempts (
  id                uuid primary key default gen_random_uuid(),
  fingerprint_hash  text not null,    -- SHA-256 of FingerprintJS visitor id (client computes hash)
  ip_hash           text not null,    -- SHA-256 of the request IP (server computes hash)
  trend_id          uuid not null references public.trends(id) on delete cascade,
  output_image_url  text,
  status            generation_status not null default 'pending',
  cost_usd          numeric(10,5) not null default 0,
  expires_at        timestamptz not null default now() + interval '24 hours',
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  unique (fingerprint_hash, ip_hash)
);
```

The `UNIQUE (fingerprint_hash, ip_hash)` constraint is the lifetime gate. A returning device with the same fingerprint + same NAT IP cannot insert again. Postgres returns a duplicate-key error which [app/api/generate-anonymous/route.ts](../../app/api/generate-anonymous/route.ts) translates to HTTP 409 with the "you already used your free trial" message.

**Daily abuse budget**: before any insert, the route sums `anonymous_attempts.cost_usd` over the last 24h and compares to `ANONYMOUS_DAILY_BUDGET_USD` (default $20). If exceeded, returns 503. Auto-resets at the 24h sliding window — no operator action needed.

**Turnstile** runs *before* the budget check so that bots burning Turnstile tokens don't even consume the budget query.

**24-hour expiry**: `expires_at = now() + interval '24 hours'`. The result page ([app/anonymous/[id]/page.tsx](../../app/anonymous/[id]/page.tsx)) checks expiry and surfaces a clean "trial expired, sign up to keep your future results" state. The Storage object is purged by the daily pg_cron job ([supabase/migrations/20260527000005_pg_cron.sql](../../supabase/migrations/20260527000005_pg_cron.sql)).

## Consequences

**Positive:**
- Cost is hard-bounded at $20/day across the entire anonymous surface. Worst-case attack burns one day of budget then auto-disables until tomorrow.
- One fingerprint+IP = one lifetime attempt. Account dodging requires *both* clearing the browser fingerprint *and* changing IP — significant effort per attempt.
- The fingerprint is computed client-side and SHA-256'd before transmission. We never see raw fingerprint data on the server, which keeps the privacy story clean for the listing pitch.
- The 24h expiry + auto-purge limits the long-term Storage cost of anonymous results.

**Negative:**
- Fingerprint+IP both matching is rare across NAT'd networks; a coffee shop where two people each try one trial will both succeed (different fingerprints, same IP), but a single user switching from coffee-shop wifi to home wifi (same fingerprint, different IP) can attempt twice. This is intentional — punishes intentional evasion but doesn't break legitimate dual-use. Acceptable tradeoff.
- FingerprintJS commercial license costs apply if open-source-FP isn't sufficient. Currently using the OSS version; would need to revisit if attack volume crosses what OSS-FP catches.
- The 24h expiry is a UX cliff. Users who don't sign up within 24h lose their result. Mitigated by an in-page "save it forever" CTA + the expiring badge.
- Daily abuse budget is global, not per-IP. One sophisticated attacker can burn the budget for everyone. Acceptable for MVP — would shard per-/24 IP block or per-fingerprint-cluster if attack patterns emerge.

## Alternatives considered

**Token-per-session anonymous flow.** Rejected: requires server state per anonymous visitor. The fingerprint+IP key is stateless from the server's perspective until the first attempt.

**Per-IP-only quota.** Rejected: shared IPs (university wifi, coffee shop, mobile carrier NAT) would lock out legitimate users.

**Per-fingerprint-only quota.** Rejected: fingerprint clearing (incognito, fresh browser profile) is too easy. IP backstop catches the casual evasion.

**No anonymous flow; gate everything behind signup.** Rejected: tanks the trial→signup funnel by 5–10x per industry data. The whole reason the anonymous flow exists is the funnel lift.
