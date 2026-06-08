# Botdog

An AI LinkedIn headshot generator. Upload a selfie, pick a profession style, get a polished, true-to-you LinkedIn headshot in seconds.

![Next.js 16](https://img.shields.io/badge/Next.js-16-black) ![React 19](https://img.shields.io/badge/React-19-149eca) ![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6) ![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Tests 404 passing](https://img.shields.io/badge/tests-404%20passing-22c55e) ![Routes 50](https://img.shields.io/badge/routes-50-8b5cf6) ![License Proprietary](https://img.shields.io/badge/license-Proprietary-lightgrey)

> Stack: Next.js 16 · React 19 · TypeScript 5 · Tailwind v4 · Backend: Supabase (Auth · DB · Storage · Edge Functions · pg_cron) · Tests: 404 passing across 43 files · Routes: 50 built · License: Proprietary

Botdog turns a phone selfie into a studio-quality LinkedIn headshot by calling Google Gemini's Nano Banana 2 image model through a provider-agnostic shim. A 14-profession style picker sets the outfit, background, and lighting; the homepage `/` IS the generator. Consumers upload, watch the result render, and share — anonymous trial, free weekly quota, and Stripe credit-packs cover the conversion funnel. The codebase is the asset: full admin dashboard suite, ADRs, SOPs, complete diligence data-room.

---

## Quick start

```bash
pnpm install
cp .env.local.example .env.local          # then fill values per docs/CREDENTIALS.md
pnpm supabase start                       # optional — local Supabase stack (Docker required)
pnpm dev
```

Open <http://localhost:3000>.

`pnpm` is the only supported package manager — the lockfile + CI assume it and the virtual-store layout is path-sensitive.

---

## Scripts

| Command               | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `pnpm dev`            | Next.js dev server (Turbopack default) on `:3000`                  |
| `pnpm build`          | Production build — emits the 50-route table                        |
| `pnpm test`           | Vitest unit + component tests (404 across 43 files)                |
| `pnpm test:e2e`       | Playwright E2E (chromium / webkit / mobile-chrome / mobile-safari) |
| `pnpm typecheck`      | `tsc --noEmit` — strict TypeScript, zero `any` permitted           |
| `pnpm lint`           | ESLint 9 flat config                                               |
| `pnpm format`         | Prettier 3 + tailwind plugin (`format:check` for CI mode)          |
| `pnpm supabase:reset` | Re-apply all migrations + seed against the local Supabase stack    |
| `pnpm supabase:types` | Regenerate `lib/supabase/database.types.ts` from live schema       |
| `pnpm analyze`        | `cross-env ANALYZE=true next build` — emits bundle analyzer report |

Full script list in [`package.json`](./package.json).

---

## Architecture

Next.js 16 App Router on Vercel + Supabase (Postgres / Auth / Storage / Edge Functions / pg_cron) + Google Gemini behind a provider abstraction (`lib/image-provider/index.ts`) + Stripe Checkout for credit packs. Image generation is asynchronous — `/api/generate` returns in under a second; a Database Webhook fires the Edge Function which calls Gemini, uploads the output, and updates the row; the result page subscribes via Realtime and falls back to Web Push + Resend email when the user navigates away.

Full system diagram, sequence diagrams, data model, RLS posture, and infra cost shape live in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Key features

- **Single headshot tool with a style picker** — one `linkedin-headshot` trend (14 profession styles) curated via admin CRUD + an eval gate (`is_active=true` requires `eval_status='passed'` via DB constraint)
- **Schema-driven inputs** — `trends.input_schema jsonb` renders the dynamic upload form (photo + required style select); never hardcode "1 photo"
- **Anonymous trial** — exactly 1 generation per `(fingerprint_hash, ip_hash)` lifetime, gated by Cloudflare Turnstile and a global $20/day cost ceiling
- **RLS-enforced free-tier quota** — DB trigger blocks `generations` INSERT when `free_used_this_week >= 5 AND credits_balance <= 0`; pg_cron refills every Sunday 00:00 UTC
- **Stripe credit packs** — three SKUs ($4.99 / $14.99 / $39.99 = 50 / 200 / 600 credits); idempotent webhook handler dedups via `webhook_events.event_id`
- **Provider abstraction** — Gemini is the default, OpenAI is wired as a stub; switching is a one-env-var change (`IMAGE_PROVIDER=openai`)
- **Admin dashboards** — Engagement / Margin (revenue cohorts + unit economics) / Users (WAU/DAU + funnel + retention) / Quota blocks / Trends / Suggestions / VIP / Refunds / Audit / Export / Marketing spend
- **GDPR soft-delete + 30d purge** — `profiles.deleted_at` cascades through user data; pg_cron hard-deletes after 30 days; cookie consent banner ships with the app
- **Buyer due-diligence dashboards** — 4 diligence surfaces (Engagement, Margin, Users, Quota Blocks) plus a complete data-room at [`docs/data-room/`](./docs/data-room/)

---

## Project layout

```
app/                    Routes — (public), (auth), (app), admin, api — App Router
lib/                    Domain logic — image-provider, payments, supabase, push, eval, referrals
components/             UI primitives + brand layer (shadcn/ui ejected into components/ui/)
supabase/               Migrations (timestamped SQL) + Edge Function (generate-image)
docs/                   ADRs, SOPs, runbooks, architecture, legal templates, press kit, data room
```

- **`app/`** — `(public)` (home + SSR trend pages + legal), `(auth)` (login), `(app)` (result + me/creations + me/settings), `admin/*` (full dashboard suite), `api/*` (generate / stripe / push / referral / export endpoints)
- **`lib/`** — feature-organized, not type-organized; every module under 800 lines; provider abstractions for image generation, payments, push, email
- **`supabase/migrations/`** — 19 timestamped migrations; every schema change has its own file; regenerate types with `pnpm supabase:types` after each
- **`docs/`** — buyer-facing; ADRs cover load-bearing decisions, SOPs cover daily operations, runbook covers cred-to-ship sequence, data-room covers diligence

---

## Documentation

| Doc                                                      | Purpose                                                                                                                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)         | System diagram, sequence diagrams, data model, RLS posture, infra cost shape                                                                                   |
| [`docs/RUNBOOK.md`](./docs/RUNBOOK.md)                   | Cred-arrival to ship sequence + 14-test verification matrix                                                                                                    |
| [`docs/CREDENTIALS.md`](./docs/CREDENTIALS.md)           | Per-env-var reference — where to source, what breaks if missing                                                                                                |
| [`docs/LAUNCH_CHECKLIST.md`](./docs/LAUNCH_CHECKLIST.md) | Placeholder-string + dev-flag audit; brand swap targets; final pre-DNS gate                                                                                    |
| [`docs/adr/`](./docs/adr/)                               | 7 Architecture Decision Records — credit packs vs subscription, RLS quota strategy, schema-driven inputs, eval gate, idempotency, soft-delete, anonymous trial |
| [`docs/sops/`](./docs/sops/)                             | 5 Standard Operating Procedures — daily ops, incident response, refund handling, weekly new-trend workflow, takedown handling                                  |
| [`docs/legal/`](./docs/legal/)                           | DPA template + sub-processor list (GDPR Article 28 compliant)                                                                                                  |
| [`docs/transferability/`](./docs/transferability/)       | Per-account transfer plan + post-acquisition timeline                                                                                                          |
| [`docs/data-room/`](./docs/data-room/)                   | Buyer-facing diligence package (financial / customer / product / infrastructure / ownership / legal / runbooks)                                                |
| [`docs/press-kit/`](./docs/press-kit/)                   | Sell sheet, launch thread templates, founder bio                                                                                                               |
| [`CLAUDE.md`](./CLAUDE.md)                               | Project conventions, non-negotiables, active skills (AI-agent oriented)                                                                                        |
| [`CHANGELOG.md`](./CHANGELOG.md)                         | Keep-a-Changelog history of releases                                                                                                                           |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)                   | Branch + commit + migration discipline; reviewer checklist                                                                                                     |
| [`SECURITY.md`](./SECURITY.md)                           | Vulnerability disclosure policy                                                                                                                                |

---

## Verification gates

Local sanity loop (no creds needed, runs in ~90s on a current laptop):

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Production gate — the 14-test verification matrix in [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) §3 — must pass against the production deploy before DNS goes live. Covers RLS quota, idempotency replay, retry + refund, schema-driven form, eval gate, push + email fallback, SSR HTML, pg_cron purge, referral farming guard, Stripe webhook dedup, GDPR delete cascade, PostHog funnel, sitemap + robots.

End-to-end (Playwright, full creds required for paid flows):

```bash
pnpm test:e2e
```

---

## Security

See [`SECURITY.md`](./SECURITY.md) for the vulnerability disclosure policy, scope, and safe-harbor language. Critical-severity issues get an initial response within 72 hours and a fix or mitigation plan within 14 days.

---

## Contributing

This is a proprietary solo project today. The contribution process is documented in [`CONTRIBUTING.md`](./CONTRIBUTING.md) so a new owner (or invited collaborator) can ramp without re-deriving the conventions.

---

## License

Proprietary — all rights reserved. See [`LICENSE`](./LICENSE). For licensing or acquisition inquiries, see [`docs/press-kit/sell-sheet.md`](./docs/press-kit/sell-sheet.md).

---

## Status

Pre-launch (last updated 2026-05-29). Codebase is feature-complete pending user-side credentials; phases W0 through W5 of the sellable-asset plan are code-complete; W6+ is gated on domain + Stripe live-mode + Resend DNS verification. For acquirer inquiries see [`docs/press-kit/sell-sheet.md`](./docs/press-kit/sell-sheet.md).
