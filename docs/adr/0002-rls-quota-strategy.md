# ADR 2: Enforce the free-tier weekly quota at the Postgres RLS / trigger layer

Date: 2026-05-29
Status: Accepted

## Context

The free tier allows 5 generations per week, refilled every Sunday 00:00 UTC. Once exhausted, the user must either buy a credit pack or wait for the refill. The quota counter lives at `profiles.free_used_this_week` (see [supabase/migrations/20260527000001_profiles.sql](../../supabase/migrations/20260527000001_profiles.sql)).

The challenge: `/api/generate` ([app/api/generate/route.ts](../../app/api/generate/route.ts)) is the obvious enforcement point, but it has at least three legitimate replay paths:
1. `Idempotency-Key` replays where the client retries on transient network failure (see [lib/idempotency.ts](../../lib/idempotency.ts) and ADR 5).
2. The anonymous → authenticated bridge ([app/api/generate-anonymous/route.ts](../../app/api/generate-anonymous/route.ts)) which uses different state.
3. The eval workflow ([app/admin/trends/[id]/eval/actions.ts](../../app/admin/trends/[id]/eval/actions.ts)) which writes to `trend_eval_runs` rather than `generations`, but reuses the same Gemini cost path.

If the quota check lived only in `/api/generate`, every alternate write path would need to replicate the gate. One missed code path = silent free-tier abuse, which is a margin-destroying class of bug.

## Decision

Enforce the quota with a **BEFORE INSERT trigger** on `public.generations` (see [supabase/migrations/20260527000003_generations.sql](../../supabase/migrations/20260527000003_generations.sql)). The trigger:

1. Reads the row being inserted's `user_id`.
2. Looks up `profiles.free_used_this_week` + `profiles.credits_balance` for that user.
3. Raises `'quota exhausted'` if `free_used_this_week >= 5 AND credits_balance <= 0`.
4. Otherwise allows the insert and atomically increments `free_used_this_week` OR decrements `credits_balance` (free quota consumed first).

A pg_cron job at Sunday 00:00 UTC ([supabase/migrations/20260527000005_pg_cron.sql](../../supabase/migrations/20260527000005_pg_cron.sql)) resets `free_used_this_week = 0` for every profile.

The API layer (`/api/generate`) still does a soft pre-check for better UX (shows the quota-upsell modal instead of waiting for the 500), but the **trigger is the source of truth**.

## Consequences

**Positive:**
- Every write path through `generations` is automatically gated. New API routes, internal admin tools, future SDK clients — all gated by default. There's no way to forget.
- The check is atomic with the insert (same transaction), so race conditions between two parallel `/api/generate` calls from the same user resolve correctly.
- The pg_cron weekly reset is one source of truth — no clock-drift between app-server reset jobs.
- For diligence: a buyer can run `select count(*) from generations where created_at > now() - interval '7 days' group by user_id having count(*) > 5;` and confirm zero rows exist. Quota enforcement is verifiable from SQL alone.

**Negative:**
- The error surface is a Postgres exception (`P0001` with `'quota exhausted'` message), which the API layer has to translate into a 402 HTTP status. That translation lives in [app/api/generate/route.ts](../../app/api/generate/route.ts) — one extra mapping step.
- The trigger function uses `SECURITY DEFINER` to read `profiles` even when the calling role doesn't have direct SELECT permission. That's a privilege expansion; reviewed and documented in the migration comments.
- Debugging requires `psql` access to read the trigger source. JavaScript-only developers will need a quick orientation.

## Alternatives considered

**Application-layer middleware only.** Rejected: every new write path becomes a place to forget the gate. The class of bug is "silent free-tier abuse" — the worst category for margin.

**No DB-level enforcement; rely on Row-Level Security policies + a "free tier" view.** Rejected: RLS policies can gate SELECT/UPDATE/DELETE cleanly but INSERT-time *aggregate* checks (`count(*) >= 5`) are awkward in policy language. Triggers are the right tool.

**Soft enforcement (allow the insert, refund later).** Rejected: the Gemini cost is incurred at the time of the call. A "refund later" model means we eat the cost on every abuse attempt. Hard pre-check at insert is the only way to bound the variable cost.
