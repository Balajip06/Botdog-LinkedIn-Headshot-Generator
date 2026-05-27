# Trend Image Generator

Viral-trend image generator. Next.js 16 + Supabase + Google Gemini (Nano Banana / Nano Banana Pro). Consumer-facing, IG + TikTok distribution.

> **Authoritative plan:** [`trend-image-app-plan.md`](trend-image-app-plan.md) (original) — amendments live in `.claude/plans/check-this-plan-c-users-balaj-projects-t-luminous-prism.md` and supersede the original on conflict.
>
> **Project instructions for AI agents:** [`CLAUDE.md`](CLAUDE.md).

## Stack

- **Frontend:** Next.js 16.2 App Router, React 19.2, TypeScript 5.9, Tailwind v4, shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions + pg_cron)
- **AI:** Google Gemini — Nano Banana Pro default, v1 quick toggle
- **Payments:** Stripe Checkout, USD, one-time credit packs
- **Email:** Resend
- **Push:** Web Push (VAPID); iOS via PWA install
- **Anti-bot:** Cloudflare Turnstile
- **Observability:** PostHog (analytics) + Sentry (errors)
- **Rate limit:** Upstash Redis (sliding window)
- **Testing:** Vitest + Playwright (chromium / webkit / mobile-chrome / mobile-safari)

## Quick start

```bash
pnpm install
cp .env.local.example .env.local        # fill secrets
pnpm exec playwright install chromium webkit
pnpm supabase start                     # requires Docker Desktop
pnpm supabase db reset                  # applies migrations
pnpm supabase:types                     # regenerate lib/supabase/database.types.ts
pnpm dev
```

Open <http://localhost:3000>.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Next dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | ESLint 9 (flat config) |
| `pnpm format` / `pnpm format:check` | Prettier 3 + tailwind plugin |
| `pnpm test` / `pnpm test:watch` / `pnpm test:ui` | Vitest |
| `pnpm test:e2e` / `pnpm test:e2e:ui` | Playwright |
| `pnpm supabase:start` / `pnpm supabase:stop` / `pnpm supabase:reset` | Local Supabase stack |
| `pnpm supabase:types` | Regenerate `lib/supabase/database.types.ts` from live schema |
| `pnpm supabase:migration:new <name>` | Create timestamped migration |

## Folder layout

```
/app                  Routes — (public), (auth), (app), admin, api
/lib
  /supabase           Browser + server + service-role clients, middleware helper, generated types
  /utils              cn, …
/components           UI primitives
/e2e                  Playwright specs
/supabase/migrations  Timestamped SQL migrations
/.claude              Project tracker (todo, lessons, session-log)
/.github/workflows    CI pipelines
```

## Non-negotiables

- **RLS-enforced quota.** DB trigger blocks generation insert when `free_used_this_week ≥ 5 AND credits_balance ≤ 0`.
- **Idempotency.** `/api/generate` accepts `Idempotency-Key`; duplicate POST = 1 Gemini call.
- **Eval gate.** `is_active=true` requires `eval_status='passed'` (DB constraint).
- **Cost tracking.** Every `generations` row records `cost_usd`.
- **Soft-delete + audit log.** GDPR-compliant, cascading via `deleted_at`.
- **Stripe webhook idempotency.** `webhook_events.event_id` unique.
- **Per-IP rate limit.** 20 generations / hour / IP at Edge.
- **Anonymous trial.** Exactly 1 attempt per fingerprint + IP lifetime; global $20/day abuse budget.

See [`CLAUDE.md`](CLAUDE.md) for the full list and current phase state.

## License

Proprietary — all rights reserved.
