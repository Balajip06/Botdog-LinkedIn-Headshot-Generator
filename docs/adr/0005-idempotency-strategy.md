# ADR 5: Client-supplied `Idempotency-Key` header on `/api/generate` with DB-enforced dedup

Date: 2026-05-29
Status: Accepted

## Context

`/api/generate` ([app/api/generate/route.ts](../../app/api/generate/route.ts)) triggers a multi-step pipeline:

1. Insert a row into `generations` (status: pending).
2. A Supabase Database Webhook calls the Edge Function ([supabase/functions/generate-image/](../../supabase/functions/generate-image/)).
3. The Edge Function calls Gemini, uploads the output PNG to Storage, updates the row to `completed`.
4. The user's browser polls or subscribes via Supabase Realtime for status.

Network flakiness on the client side — flaky mobile cell, browser tab backgrounded mid-fetch, optimistic retry on a 502 — can cause **duplicate POSTs to `/api/generate`**. Without dedup:

- Two Gemini calls for one user intent = double Gemini cost.
- Two `generations` rows = the quota trigger (ADR 2) decrements credits twice.
- Two output images, two refund-on-failure paths, two confusion-worthy UX states.

The cost class is real: even with a 0.1% double-POST rate at $5K/mo run-rate, that's hundreds of dollars per quarter in wasted Gemini calls. Diligence reviewers see Gemini cost variance as a margin-stability red flag.

## Decision

Require an **`Idempotency-Key` HTTP header** on every `/api/generate` POST. The contract:

1. Client generates a UUIDv4 per user intent (one key per "click the generate button").
2. Server validates the header via [lib/idempotency.ts](../../lib/idempotency.ts) — must be a 36-char UUID, freshly minted.
3. The key is stored on `generations.idempotency_key` with a UNIQUE constraint ([supabase/migrations/20260527000003_generations.sql](../../supabase/migrations/20260527000003_generations.sql)).
4. On INSERT failure with unique-violation, the route looks up the existing row and returns `{ generation_id, replayed: true }` — same response shape as a fresh insert.
5. The client treats `replayed: true` identically to a fresh response (poll the same row, render the same UI).

Replays cost ~5ms of DB lookup. No Gemini call, no quota debit, no double-billing.

The Stripe webhook ([app/api/stripe/webhook/route.ts](../../app/api/stripe/webhook/route.ts)) uses the same pattern with `webhook_events.event_id` UNIQUE; same dedup primitive, different table.

## Consequences

**Positive:**

- Eliminates the duplicate-POST cost class. A buyer querying Gemini-spend variance sees a flat curve, not spikes from network retries.
- The replay is server-authoritative — the client doesn't need any state to recover. Refreshing the result page works; backgrounding the tab and resuming works; airplane-mode-to-wifi works.
- Same pattern works for both the authenticated `/api/generate` and anonymous `/api/generate-anonymous` paths.

**Negative:**

- Client has to generate a UUID per intent. If the client logic re-uses a stale key (a real bug in 2026-05 when the form was generating the key once on mount instead of once per submit), the second click silently returns the first result. Mitigation: client generates the key inside the submit handler, not on mount. Documented in lessons log.
- Server has to do an extra unique-constraint round-trip on every insert. Negligible at our scale; would be a hot-path if we crossed 1000 req/sec.
- Adds one more required header. Test fixtures + Playwright E2E specs have to set it; documented in [docs/RUNBOOK.md](../RUNBOOK.md) Test 12.

## Alternatives considered

**Request-body hashing (no client header needed).** Rejected: legitimate use cases require the same body to be acceptable twice (e.g., user generates "ghibli photo X", regenerates same photo). Body hash would block that.

**Server-generated keys returned to the client.** Rejected: requires a pre-flight GET before every POST. Doubles the round-trip count.

**No idempotency; rely on optimistic UI + manual support.** Rejected: cost class is real and unpriced. Refund volume from "I got charged twice for one click" would dominate the refund queue.
