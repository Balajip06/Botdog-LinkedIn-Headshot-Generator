# Tech Defensibility — Single-Provider Risk and Lock-in

**Last refreshed:** 2026-05-29
**Audience:** seller, answering "what's your single-provider exposure?" — the standard tech-diligence question.
**Bottom line:** Gemini, Supabase, and Vercel are all replaceable in 1–4 weeks of work. Stripe is the deep lock-in; see [03-stripe-card-non-transfer.md](03-stripe-card-non-transfer.md).

Trendly's stack has four named vendor dependencies. This file walks through each one: what the dependency is, how exposed we are, and what the migration path looks like if a buyer ever needed to leave.

---

## Gemini dependency — DEFUSED

**The risk.** Trendly's image generation runs on Google's Gemini Nano Banana Pro. If Google deprecates the model, raises pricing 10×, or imposes new content policies that conflict with Trendly's product surface, the business is exposed.

**The mitigation.** Image generation sits behind a provider abstraction at [`lib/image-provider/`](../../lib/image-provider/). The relevant files:

| File                                                                 | Role                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`lib/image-provider/index.ts`](../../lib/image-provider/index.ts)   | Provider switcher — reads `IMAGE_PROVIDER` env, dispatches to `gemini` or `openai`. Default `gemini`. |
| [`lib/image-provider/gemini.ts`](../../lib/image-provider/gemini.ts) | Production Gemini client (real).                                                                      |
| [`lib/image-provider/openai.ts`](../../lib/image-provider/openai.ts) | OpenAI Images stub — same function signature, returns `not-configured`. Designed to be filled in.     |
| [`lib/image-provider/types.ts`](../../lib/image-provider/types.ts)   | Shared types: `GenerateImageArgs`, `GenerateImageResult`, `ImageProvider` union.                      |

**What this means for the buyer.** Swapping to OpenAI Images (or Stability, Flux, Replicate, etc.) is a 1-file implementation task. The stub already exists. The router already routes. No database migration, no API contract change, no consumer-facing code edit. Estimated effort: 2–4 days of engineering work for a competent backend dev to implement `openai.ts` end-to-end against the existing types.

**Cost portability.** Gemini Nano Banana Pro and OpenAI gpt-image-1 are within ~30% of each other on per-image cost as of 2026-05-29. Switching providers does not catastrophically alter unit economics. See [`docs/data-room/01-financial/unit-economics.md`](../data-room/README.md#01-financial--revenue-costs-unit-economics) for the sensitivity table.

---

## Supabase dependency — PORTABLE in 1–2 weeks

**The risk.** Supabase runs Postgres + Auth + Storage + Realtime + Edge Functions + pg_cron. A buyer might prefer their own infrastructure or have an existing Postgres+Auth0+S3 stack.

**The mitigation.** Trendly's Supabase usage is **standard Postgres**, not Supabase-proprietary syntax:

| Supabase feature         | Underlying tech             | Portable to                                              |
| ------------------------ | --------------------------- | -------------------------------------------------------- |
| Postgres database        | Standard Postgres 15+       | Neon, RDS, Aurora, Crunchy Bridge, self-hosted           |
| Row Level Security (RLS) | Standard Postgres feature   | Any Postgres                                             |
| Auth (email + OAuth)     | Custom Supabase JWT         | Auth0, Clerk, NextAuth, Lucia                            |
| Storage (image upload)   | S3-compatible API           | S3 directly, R2, B2                                      |
| Realtime (websockets)    | Phoenix Channels            | Pusher, Ably, self-hosted Soketi                         |
| Edge Functions           | Deno on Supabase Edge       | Vercel Edge Functions, Cloudflare Workers                |
| pg_cron                  | Standard Postgres extension | Any Postgres with `pg_cron`, or external cron + endpoint |

**The migration touchpoints.** Approximately 15 files import from `@supabase/supabase-js`:

- Server clients: [`lib/supabase/server.ts`](../../lib/supabase/server.ts), [`lib/supabase/middleware.ts`](../../lib/supabase/middleware.ts).
- Client clients: [`lib/supabase/client.ts`](../../lib/supabase/client.ts).
- Service role: [`lib/supabase/service-role.ts`](../../lib/supabase/service-role.ts).
- Storage helpers: ~3 files under `lib/storage/`.
- Auth helpers: a few `app/login/` + `proxy.ts` references.
- ~7 of the 9 API routes touch one of the clients above.

**Migration effort.** 1–2 weeks of focused work to swap to a Neon + S3 + Auth0 + Soketi stack. The 23 migration files in `supabase/migrations/` are standard Postgres SQL — they replay against any Postgres. The RLS policies replay too (Supabase doesn't extend Postgres RLS; it just uses it).

**Why we don't recommend doing this pre-listing.** The migration is doable but invasive. A buyer is better off acquiring on Supabase and migrating post-close on their own timeline, if at all.

---

## Vercel dependency — TRIVIAL replacement

**The risk.** Trendly's hosting is on Vercel. If Vercel's pricing changes, the buyer prefers their own infra, or there's a region/uptime concern, the buyer needs to move off.

**The mitigation.** Next.js 16 App Router runs anywhere Node 22 runs. The Vercel-specific bits:

| Vercel feature        | What we use it for                                                             | Replacement                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js hosting       | App Router + Turbopack + middleware                                            | Self-host on any Node 22 host (Railway, Fly.io, Render, EC2). Standard `pnpm build && pnpm start`.                                                                        |
| `vercel.json` crons   | Three scheduled jobs (purge soft-deleted, reset weekly quota, refresh sitemap) | Replaceable with cron-job.org calling our existing API routes, or Supabase pg_cron (already used for the weekly quota reset — `pg_cron` is the canonical home for these). |
| Vercel Analytics      | Web Vitals tracking                                                            | Replace with PostHog Web Vitals (already wired) or Plausible.                                                                                                             |
| Vercel Speed Insights | Same                                                                           | Same.                                                                                                                                                                     |
| Edge Functions        | None — our Edge Function lives in **Supabase**, not Vercel                     | n/a — already non-Vercel.                                                                                                                                                 |

**Migration effort.** 2–3 days to move hosting. The DNS cutover dominates the timeline (24–48h propagation). Build + deploy elsewhere is hours, not weeks.

---

## Stripe dependency — DEEP LOCK-IN

**The risk.** Stripe is the only vendor in the Trendly stack with **customer-data lock-in**. Moving off Stripe means re-establishing every customer's payment relationship from scratch.

**The mitigation.** None. Migrating away from Stripe pre-listing is **not recommended** because:

- The buyer wants Stripe — Stripe is the MicroSaaS standard. A buyer who sees "we just migrated to Paddle to defuse Stripe risk" reads that as "this team panics and rewrites infrastructure."
- Customer-card re-auth on a Stripe-to-Paddle (or Stripe-to-Lemon Squeezy) migration causes the same 30–60% churn as the post-close Stripe-to-Stripe re-auth — except the seller absorbs the churn pre-listing, dropping revenue and dragging valuation.
- Paddle / Lemon Squeezy / FastSpring's "merchant of record" model is genuinely useful for tax compliance, but **does not solve** the customer-card-data-portability problem. Both models lock you in.

**The honest framing for a buyer.** "We use Stripe. The Stripe Account Transfer mechanism is the standard path — see [03-stripe-card-non-transfer.md](03-stripe-card-non-transfer.md) for the re-auth campaign that ships with the asset."

Migrating away from Stripe **post-close** is the buyer's choice. We'd estimate ~4 weeks of engineering + 60–80% customer churn on the migration. Not recommended.

---

## Test stack lock-in — NONE

**Vitest** (unit) and **Playwright** (E2E) are both open-source MIT-licensed projects. No SaaS subscription, no vendor lock-in, no per-seat pricing. The test suite runs locally on any Node 22 host with `pnpm test` and `pnpm test:e2e`.

**Current test inventory:** 31 Vitest files / 283 tests, all passing. Playwright suite covers the login → generate → share → pay critical flow on Chromium + WebKit + mobile Chrome + mobile Safari.

A buyer can fork the repo and run the entire test suite in CI without depending on any service we control. This is unusual for a MicroSaaS at this price point and worth surfacing as a positive in the listing.

---

## AI model swap demo — 1-paragraph procedure

For the buyer's technical reviewer, here is the literal swap procedure from Gemini to OpenAI Images:

1. Implement [`lib/image-provider/openai.ts`](../../lib/image-provider/openai.ts) — currently a 28-line stub returning `{ ok: false, reason: 'not-configured' }`. Replace the body with an `openai.images.generate({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024' })` call against `process.env.OPENAI_API_KEY`. Map the response to the existing `GenerateImageResult` type. The shape is already defined in [`lib/image-provider/types.ts`](../../lib/image-provider/types.ts); no contract change needed.
2. Set environment variables in Vercel production: `IMAGE_PROVIDER=openai` and `OPENAI_API_KEY=sk-...`.
3. Redeploy. No database migration. No API route change. No consumer-facing UI change. Existing generations remain on Gemini (they're stored as completed rows, the provider field is informational). New generations go to OpenAI.

**Total elapsed wall-clock:** under 30 minutes for a competent engineer, assuming OpenAI API access is already provisioned. The provider switcher in [`lib/image-provider/index.ts`](../../lib/image-provider/index.ts) (lines 33–48) is the entire decision point — 15 lines of code.

A buyer's technical reviewer can verify this in 10 minutes by reading the four files in `lib/image-provider/` and confirming the call sites in `app/api/generate/` import only from `@/lib/image-provider`, never from `@/lib/gemini/*` directly.

---

## Defensibility summary table

| Dependency          | Lock-in level                            | Migration effort        | Recommended?                                              |
| ------------------- | ---------------------------------------- | ----------------------- | --------------------------------------------------------- |
| Gemini              | Low — abstracted                         | 2–4 days                | Yes if pricing changes                                    |
| Supabase            | Medium — standard Postgres + custom Auth | 1–2 weeks               | Post-close only, buyer's choice                           |
| Vercel              | Low — standard Next.js                   | 2–3 days                | Post-close only, buyer's choice                           |
| Stripe              | **High — customer-data lock-in**         | ~4 weeks + 60–80% churn | **No** — accept the constraint, ship the re-auth campaign |
| Vitest + Playwright | None — open-source                       | n/a                     | n/a                                                       |

---

## Cross-references

- [`lib/image-provider/`](../../lib/image-provider/) — the abstraction layer (4 files, ~80 lines total).
- [03-stripe-card-non-transfer.md](03-stripe-card-non-transfer.md) — why Stripe migration is the wrong move.
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — the full system architecture, including dependency surface.
- [`docs/CREDENTIALS.md`](../CREDENTIALS.md) — which env vars unlock which dependency.
- [`docs/transferability/per-account-transfer-plan.md`](../transferability/per-account-transfer-plan.md) — per-vendor cutover mechanics if a buyer chooses to migrate.
- [`docs/data-room/04-infrastructure/`](../data-room/README.md#04-infrastructure--stack-sub-processors-security-posture) — full sub-processor list with security overviews.
