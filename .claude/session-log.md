# Session Log

Append at end of each session. Newest on top.

Format:
```
## YYYY-MM-DD — short title
**Done:** what shipped
**Open:** what's parked
**Next:** what to start next session
**Phase:** current phase
**Blockers:** any
```

---

## 2026-05-28 — Phase 1 working model closed; remote push deferred

**Done:**
- `app/api/generate-anonymous/route.ts` — anonymous-trial endpoint. Idempotency-Key parse → Zod body (trend_slug + values + turnstile_token + 64-hex fingerprint_hash) → Cloudflare Turnstile siteverify (passthrough when `TURNSTILE_SECRET_KEY` absent) → `anonymousFingerprintLimiter` sliding window (5/day per fingerprint) → daily abuse-budget guard (sum 24h `cost_usd` vs `ANONYMOUS_DAILY_BUDGET_USD`, 503 on breach) → trend lookup → schema re-validation + interpolate/collectImageInputs → SHA-256 IP hash → insert via service-role into `anonymous_attempts` → 409 on lifetime-replay (UNIQUE fingerprint_hash+ip_hash)
- `supabase/seed.sql` — local-dev seed: promotes `admin@example.com` to admin_users (no-op if absent) + 1 sample trend (`ghibli-portrait`, `eval_status='passed'`, `is_active=true`, full FAQ, schema-compatible input_schema). Lets `pnpm supabase db reset` produce a clickable home page.
- `README.md` — appended Phase 1 verification runbook (10 manual checks matching DB triggers + constraints): RLS quota block + decrement, idempotency replay, admin gate, Stripe webhook dedup, anonymous-trial 2nd-attempt 409, abuse-budget 503, eval gate constraint, soft-delete RLS filter, pg_cron job list. Plus plan/state docs table.

**Verification gates green (no creds needed):**
- `pnpm typecheck` clean
- `pnpm lint` clean
- `pnpm test` 36/36 across 6 suites (cn, interpolate, json-ld, idempotency, image, gemini cost)
- `pnpm build` clean — 10 routes: `/`, `/_not-found`, `/api/generate`, `/api/generate-anonymous`, `/api/stripe/webhook`, `/auth/callback`, `/login`, `/robots.txt`, `/sitemap.xml`, `/trend/[slug]` (+ opengraph-image), with Proxy middleware

**Commits this session:**
- `3bbe1c1` feat: phase 1 working model - anonymous trial route, seed sql, README verification runbook

**Total project commits:** 11 (including scaffold's `3a800b1` initial commit). Branch `master`, no remote — local only.

**Pre-push safety scan (passed):**
- gh CLI 2.92 available
- No tracked `.env*` files (only `.env.local.example` w/ empty placeholders)
- No tracked sentry build artifacts
- No secret patterns in tree

**Remote push:** user opted to defer. When ready: GitHub private via `gh repo create trend-image-generator --private --source=. --remote=origin --push` after `git branch -M main`.

**Blocked external resources (require user-side action to advance beyond working-model):**
- Supabase project (Docker local OR remote project link) → apply migrations + generate strict types
- Gemini API key → replace `lib/gemini/client.ts` mock-mode with real calls
- Sentry DSN + auth token → run `pnpm dlx @sentry/wizard@latest -i nextjs`
- PostHog project key → bootstrap provider
- Stripe test-mode products → create credit packs, populate webhook events
- Resend domain (SPF + DKIM + DMARC) verified
- Cloudflare Turnstile site keys (localhost + production domain)
- Upstash Redis URL + token (optional — rate-limit no-ops without)

**Next session entry points:**
- Once any of the above creds arrive: progress the matching Phase 1 sub-task to verification
- Or: continue Phase 4 prep (watermark composer, Web Share helper, referral util, history page skeleton, PostHog event-name constants) — all unblocked
- Or: write Edge Function `supabase/functions/generate-image/index.ts` Deno handler (compiles standalone, ships when Supabase is up)

---

## 2026-05-28 — Phase 3 prep: Gemini client + idempotency + image util + push/email + /api/generate skeleton

**Done:**
- `lib/gemini/cost.ts` + test (5 cases) — per-output USD cost map (nano-banana 0.0039, nano-banana-pro 0.024); `isAnonymousBudgetExceeded(spent, cap)` (used by anonymous-trial path)
- `lib/gemini/client.ts` — `generateImage(args)` single entry point; **mock mode** when `GEMINI_API_KEY` missing returns deterministic PNG-header stub so the rest of the pipeline can be exercised in unit + dev environments without burning a real Gemini call; production mode uses `fetch` (Node + Edge compatible) with 90s `AbortController` timeout, all 4 safetySettings (sexual/harassment/hate/dangerous) at `BLOCK_MEDIUM_AND_ABOVE`; failure taxonomy `safety` | `timeout` | `transient` | `invalid`; Node+Edge base64 codec via `Buffer` with `atob/btoa` fallback
- `lib/idempotency.ts` + test (9 cases) — `generateIdempotencyKey` returns 32-char hex (UUID dashes stripped); `parseIdempotencyKey` enforces 16-128 char `[A-Za-z0-9_-]`, trims whitespace; rejects missing / too-short / too-long / bad-chars
- `lib/utils/image.ts` + test (5 cases) — `prepareImageForUpload(File)` client-side pipeline: HEIC/HEIF detected by MIME or filename extension → `heic2any` dynamic-import (keeps the HEIC bundle out of initial JS) → `createImageBitmap` → `OffscreenCanvas` `convertToBlob('image/jpeg', 0.9)`; `scaleToFit(w, h, max)` exported for testing
- `lib/push/send.ts` — `sendPush(subscription, payload)`; lazy VAPID config on first call (throws clear error if `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` missing); 404/410 returned by browser push services classified as `expired` so caller can null out `profiles.push_subscription`
- `lib/email/send.ts` — `sendEmail` Resend wrapper + `buildResultReadyEmail` template; HTML-escapes trend title to prevent injection from admin-controlled trend names
- `app/api/generate/route.ts` — `export const runtime = 'nodejs'`; flow: `parseIdempotencyKey` → `generationIpLimiter.limit` (no-op when Upstash creds absent — see `lib/rate-limit.ts`) → `supabase.auth.getUser` (401 if not signed in) → Zod body validation → `getActiveTrendBySlug` (RLS-filtered, only active + not expired) → `TrendInputSchema.safeParse(trend.input_schema)` defence-in-depth → `interpolatePrompt` + `collectImageInputs` on values → `supabase.from('generations').insert` (DB trigger consumes quota; `quota exhausted` exception maps to HTTP 402; duplicate-key error path fetches existing row by `(user_id, idempotency_key)` and returns `{ generation_id, replayed: true }`)
- `public/sw.js` — service worker `push` event handler builds notification from `{ title, body, url, icon, tag }`; `notificationclick` focuses existing matching client or opens new window via `clients.openWindow`

**Test totals:** 6 suites / 36 cases / 0 failures. `pnpm typecheck` clean.

**Commits:** `974d15b` feat: phase 3 prep - gemini client, idempotency, image util, push/email, /api/generate skeleton

**Phase 3 implementation (blocked):**
- Wire `SchemaForm` into `app/(public)/trend/[slug]/page.tsx` (client split + Supabase Storage upload + POST + Realtime + result-page nav)
- `supabase/functions/generate-image/index.ts` Deno Edge Function (DB webhook trigger → `generateImage` → Storage upload → row update → push/email)
- `app/(app)/result/[id]/page.tsx` Realtime + retry button + loading/completed/failed states
- Push permission UX (after first completion, not on signup)
- Wire push send from Edge Function on completion via `lib/push/send.ts`
- Email fallback via `buildResultReadyEmail`

**Blocking external resources:** Supabase project (Docker local or remote), Gemini API key, Resend domain verified, Upstash Redis (optional — rate-limit otherwise no-ops), full VAPID env wired

---

## 2026-05-27 — Phase 2 prep: input schema, interpolation, SEO, SSR trend page

**Done:**
- `lib/trends/input-schema.ts` — Zod discriminated union (image / text / select); strict snake_case names; per-type constraints; superRefine for duplicate names + image min≤max; `DEFAULT_TREND_INPUT` matches migration 0002's column default
- `lib/trends/interpolate.ts` — `{{field_name}}` substitution honouring text/select only; image fields excluded (multimodal-only); throws on unknown placeholder or required-missing; `collectImageInputs` returns ordered URLs for Gemini
- `lib/trends/repository.ts` — `listActiveTrends`, `getActiveTrendBySlug` with column projection + safe `input_schema` coercion (falls back to DEFAULT on parse fail) + `faq` array coercion
- `components/upload/SchemaForm.tsx` — `'use client'` rendering any TrendInput; separate `values` (text/select) vs `files` (image File[]) state; per-field validation against schema constraints (min_count, max_count, required); raw `<input type=file>` + `<input type=text>` + `<select>` (shadcn upgrade Phase 4 polish)
- `lib/seo/json-ld.ts` — `buildHowToJsonLd` (positioned steps, custom totalTime) + `buildFAQJsonLd`
- `app/(public)/layout.tsx` — public-group passthrough
- `app/(public)/trend/[slug]/page.tsx` — SSR + ISR (3600) + async `generateMetadata` with OG + Twitter + canonical, HowTo + FAQ JSON-LD via `dangerouslySetInnerHTML`, `notFound()` on missing/inactive
- `app/(public)/trend/[slug]/opengraph-image.tsx` — Next 16 OG file convention; 1200×630 PNG via `next/og`; gradient + title + description
- `app/sitemap.ts` — dynamic sitemap from `listActiveTrends`, hourly revalidate
- `app/robots.ts` — allow `/`, disallow `/admin/*` `/result/*` `/me/*` `/api/`, sitemap reference
- Test suites: `lib/trends/interpolate.test.ts` (12) + `lib/seo/json-ld.test.ts` (3) → 15 new cases; total 18/18 pass

**Decisions surfaced:**
- Image fields cannot be referenced in `prompt_template` — they pass to Gemini multimodal alongside the prompt
- `app/page.tsx` (placeholder) stays at root until Phase 2 implementation moves the real grid into `app/(public)/page.tsx` (route-group collision avoided)
- ISR revalidate = 3600s matches plan §"Phase 2 verification"
- Raw `<img>` in trend page intentional until `next/image` remotePatterns confirmed against Supabase Storage public-URL domain

**Commits:**
- `ad12071` feat: phase 2 prep - input schema, interpolation, SEO utils, SSR trend page

**Phase 2 implementation (blocked on Supabase running):**
- Admin CRUD `/admin/trends` (list + create + edit + activate)
- SchemaBuilder admin component (dnd-kit drag-reorder fields)
- Eval workflow (upload references → run prompt × inputs in parallel → grid review → pass/fail)
- Replace `app/page.tsx` placeholder with `app/(public)/page.tsx` trends grid

---

## 2026-05-27 — Phase 1 continued: auth + Stripe stub + CI + Sentry/PostHog + Next 16 proxy

**Done (this session continuation):**
- `pnpm exec playwright install chromium webkit` — browser binaries cached locally
- CI workflow `.github/workflows/ci.yml`: static (lint + format + typecheck) → unit (vitest + coverage artifact) → e2e (playwright with chromium+webkit + report artifact on failure); pnpm/action-setup + Node 22
- First Vitest smoke `lib/utils/cn.test.ts` (3 cases, all pass)
- First Playwright smoke `e2e/home.spec.ts` (heading + tagline + title metadata)
- Env validator `lib/env.ts` with Zod schema for 20+ vars; `getServerEnv()` parses once + caches, `requireEnv(key)` for required-or-throw at call sites; `ANONYMOUS_DAILY_BUDGET_USD` coerced to number with default 20
- Auth route group: `app/(auth)/layout.tsx` + `app/(auth)/login/page.tsx` (Google OAuth + magic-link server actions, `?next=` thread-through, banners) + `app/auth/callback/route.ts` (OAuth code → session)
- Stripe webhook stub: `app/api/stripe/webhook/route.ts` — runtime=nodejs, dynamic=force-dynamic, raw-body signature verify, idempotent insert into webhook_events, 503 when secret absent
- Rate limit util `lib/rate-limit.ts`: three Upstash sliding-window limiters (gen 20/hr, anon 5/d, signup 10/hr); env-aware pass-through when Upstash keys absent
- Sentry config: `sentry.client/server/edge.config.ts` (replay integration on client with mask-all-text + block-all-media; 10% trace sample; gated on DSN + prod) + `instrumentation.ts` (per-runtime register + `onRequestError` re-export) + `next.config.ts` wrapped with `withSentryConfig` (gated on DSN + auth token + prod)
- PostHog provider `components/providers/posthog-provider.tsx`: `usePathname` + `useSearchParams` pageview capture in Suspense boundary; env-driven no-op
- `app/layout.tsx`: PostHog provider wrap + project metadata
- `next.config.ts`: Supabase Storage image remote pattern, serverActions body-size 10mb
- Database.types stub loosened (index signatures) — Supabase SDK insert/select compile without `pnpm supabase:types`
- README.md replaced scaffold default with full project README
- **Next 16 middleware → proxy rename**: `middleware.ts` → `proxy.ts`, exported function renamed (`middleware` → `proxy`); CLAUDE.md gotcha added
- `pnpm build`: clean. `pnpm typecheck`: clean. `pnpm test`: 3/3 pass.

**Commits this session:**
- `ff8f84a` feat: phase 1 foundation scaffold
- `a180e5f` chore: mark phase 1.1 + 1.2 schema + 1.6 SDKs + 1.7 configs done
- `f490a7b` feat: phase 1.3 auth skeleton + 1.5 stripe webhook stub + 1.7 ci/tests + env validator
- `8ae9ce0` feat: phase 1.6 sentry/posthog wiring + next 16 proxy rename

**Open (all blocked on user-side creds/accounts):**
- Supabase project (Docker local OR remote) → apply migrations + generate strict types
- Sentry DSN + auth token → light up error capture in prod
- PostHog project key → light up event capture
- Stripe account → test mode credit-pack products + webhook secret
- Gemini API key → Phase 3 generate route
- Resend domain verified → magic-link from custom sender + email fallback
- Turnstile keys → signup CAPTCHA + anonymous gate
- Upstash Redis → rate limit + abuse budget counter

**Next safe step:**
- shadcn-style Button + Input primitives → wire into login page (currently raw HTML)
- Phase 2 prep: SchemaBuilder + SchemaForm component sketches against migration 0002's `input_schema` JSONB
- OR jump to Supabase project link when user is ready

**Phase:** 1 — Foundation
- 1.1 ✅ (scaffold) | 1.2 schema ✅ apply ⏳ blocked | 1.3 ✅ except OAuth-config | 1.4 ✅ except seed | 1.5 ✅ except test-mode | 1.6 ✅ env-driven no-op live | 1.7 ✅ except agent-browser | 1.8 ⏳ | 1.9 ⏳

---

## 2026-05-27 — Phase 1 foundation scaffolded + committed

**Done:**
- Generated VAPID keypair (saved location: user `.env.local` only — example template has empty values for safety)
- Scaffolded Next.js 16.2 via `create-next-app` into `scaffold-tmp/` (folder-caps+space workaround), merged contents to root preserving our CLAUDE.md
- Rewrote `package.json` (name = `trend-image-generator`, scripts: typecheck, format, format:check, test, test:watch, test:ui, test:e2e, supabase:*)
- Installed runtime deps: @supabase/{supabase-js,ssr}, zod, stripe, resend, web-push, @vercel/og, posthog-{js,node}, @sentry/nextjs, @upstash/{ratelimit,redis}, @fingerprintjs/fingerprintjs, heic2any, next-themes, clsx, tailwind-merge, lucide-react, class-variance-authority
- Installed dev deps: vitest + @vitest/ui + @vitejs/plugin-react + jsdom, @testing-library/{react,jest-dom,user-event}, @playwright/test, prettier + prettier-plugin-tailwindcss, @types/web-push, supabase CLI 2.101
- Configs: .prettierrc.json + .prettierignore, vitest.config.ts (80% coverage threshold), vitest.setup.ts (jest-dom matchers), playwright.config.ts (4 projects: chromium/webkit/mobile-chrome/mobile-safari, webServer auto-spawn)
- Supabase init + 5 migrations written and timestamped in `supabase/migrations/`:
  * `20260527000001_profiles.sql` — profiles + auto-create trigger + RLS
  * `20260527000002_trends.sql` — input_schema JSONB + version-bump trigger + eval gate constraint + SEO columns
  * `20260527000003_generations.sql` — idempotency unique, cost tracking, tier-aware purge_at, quota consume/refund triggers, RLS own + public-gallery
  * `20260527000004_ancillary.sql` — referrals + farming-guarded reward trigger, trend_eval_inputs/runs, trend_suggestions, admin_audit_log, webhook_events, anonymous_attempts
  * `20260527000005_pg_cron.sql` — weekly free reset (Sun 00:00 UTC), daily purges
- Lib code: `lib/supabase/{client,server,middleware,database.types}.ts`, `lib/utils/cn.ts`
- `middleware.ts` — Supabase session refresh + `/admin` gate + `/me` + `/result` authed-area gate; excludes `/api/stripe/webhook` (raw body)
- `.env.local.example` with 20+ keys (NEXT_PUBLIC_SITE_URL, Supabase trio, Gemini, Stripe trio, Resend pair, VAPID trio, Turnstile pair, PostHog pair, Sentry quartet, Upstash pair, ANONYMOUS_DAILY_BUDGET_USD)
- Replaced scaffold's boilerplate `app/page.tsx` with minimal "Trend Image Generator — Coming soon" placeholder
- Updated `app/layout.tsx` metadata with project title + metadataBase from `NEXT_PUBLIC_SITE_URL`
- Updated `.gitignore` (Supabase ignores, Sentry, env templates allow-listed, .claude/draft/, IDE folders)
- CLAUDE.md updated for Next 16.2 (not 15), added 5 new gotchas (folder-name workaround, `pnpm supabase` invocation, virtual-store path sensitivity, Stripe webhook middleware exclusion, Tailwind v4 syntax)
- `pnpm typecheck` passes clean
- Commit `ff8f84a` — "feat: phase 1 foundation scaffold" (30 files, +6749 / -1382)

**Open:**
- Supabase migrations written but not applied — needs `pnpm supabase start` (requires Docker Desktop) OR remote Supabase project linked
- Sentry config files + next.config wrap — needs `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` (user-side account creation)
- PostHog provider bootstrap — needs project key (user-side)
- Playwright browser binaries not yet downloaded (`pnpm exec playwright install`)
- CI workflow (.github/workflows/ci.yml) not yet written
- shadcn/ui init deferred until first component built
- agent-browser not yet installed (nightly cron supplement)

**Next:**
- Either: (a) install Docker Desktop + `pnpm supabase start` to verify migrations apply cleanly locally, OR (b) create Supabase project at supabase.com, link via `supabase link --project-ref ...`, push migrations
- Run `pnpm exec playwright install`
- Run `pnpm dlx @sentry/wizard@latest -i nextjs` once Sentry DSN/auth-token available
- Move to Phase 1.3 (Auth): Google OAuth provider in Supabase dashboard + magic-link email + `(auth)` route group + login UI

**Phase:** 1 — Foundation (1.1 ✅, 1.2 schema written ✅ apply ⏳, 1.6 SDKs installed ✅ init ⏳, 1.7 installed+configured ✅ binaries ⏳)

**Blockers:** Docker Desktop OR remote Supabase project; Sentry account; PostHog account (all user-side)

---

## 2026-05-27 — Plan audit + reversals synced across all docs

**Done:**
- Read existing plan + interviewed user on 12 high-leverage decisions (success goal, geography, virality vector, login flow, free quota, abuse posture, trend pipeline, latency UX, storage retention, pricing, input flexibility, SEO, prompt QA, observability, payments, job runner)
- Wrote amended plan to `~/.claude/plans/check-this-plan-...md` with: gaps + amendments table, data-model deltas, RLS additions, architecture additions (push subsystem, SEO, eval workflow, suggestion pipeline), revised phase plan (~14–16 days MVP), alternative recommendations, risk matrix (Critical/High/Med/Low + mitigations), 12-test verification matrix
- Audited `.claude/` folder vs amended plan — found tight wiring (32/32 items covered); flagged 5 minor gaps (test stack, `NEXT_PUBLIC_SITE_URL`, PWA manifest, bonus cap, wrong `vercel:vercel-storage` skill)
- Asked 4 follow-up decisions: Sentry day-1 ✅YES, anonymous trial ✅YES, 5/week refill ✅YES, E2E tool → Playwright primary + agent-browser nightly supplemental
- Verified `vercel-labs/agent-browser` is Rust CLI for AI agents, NOT Playwright replacement
- Appended Decision Reversals section to plan file
- Synced reversals into: `.claude/todo.md` (resolved Phase 0 decisions, schema column delta `free_used_lifetime`→`free_used_this_week`+`free_week_starts_at`, added Phase 1.7 Test Stack + 1.8 Anonymous Trial + renumbered 1.9 Verification, added pg_cron weekly + anonymous purge jobs, bonus cap = 50)
- Synced reversals into: `CLAUDE.md` (Source-of-Truth reversals section, Non-Negotiables #1 rule updated + #11 anonymous + #12 test gate, stack lists Sentry + test framework, Env Vars added `NEXT_PUBLIC_SITE_URL` + Sentry quartet + `ANONYMOUS_DAILY_BUDGET_USD`, e2e-testing skill added)
- Appended 2 lessons to `.claude/lessons.md` (sync-reversals-same-turn pattern + agent-browser-not-Playwright)

**Open:**
- Phase 0 external prereqs still pending (Gemini access, Stripe app, Resend domain, VAPID keys, Turnstile keys, domain, ToS/Privacy/AUP drafts, final credit-pack prices, 5 launch trends with eval photos + FAQ)
- 2 remaining decisions in Phase 0: `bonus_credits_earned` cap (default 50 if user accepts), anonymous abuse budget (default $20/day if user accepts)

**Next:**
- Resolve remaining 2 Phase 0 defaults (or accept them as written)
- Work through Phase 0 external prereqs in parallel
- Begin Phase 1.1 scaffold (`npx create-next-app@latest` with TS + Tailwind + App Router)

**Phase:** 0 — Pre-Build (decisions resolved, external prereqs pending)

**Blockers:** Phase 0 external accounts (user-side)

---

## 2026-05-27 — Project bootstrap (CLAUDE.md + trackers)

**Done:**
- Created project [CLAUDE.md](../CLAUDE.md) — stack, non-negotiables, workflow, skills, agents, folder map, phases, gotchas, conventions
- Verified karpathy-guidelines skill already installed globally (no re-clone)
- Created `.claude/todo.md` with full Phase 0–6 task tree from amended plan
- Created `.claude/lessons.md` seeded with 2 entries
- Created this `.claude/session-log.md`
- Audited against [KIMP CLAUDE.md](../../Video-Editor-kimp/CLAUDE.md); pulled in Task Management, Workflow, Self-Improvement, Verification, Gotchas, docs/ convention, Session Start Protocol

**Open:**
- Phase 0 pre-build checklist — 15+ external prerequisites unresolved (Gemini access, Stripe app, Resend domain, VAPID, Turnstile, ToS, pricing, 5 launch trends, etc.)
- Three open decisions: Sentry day-1 yes/no; anonymous trial yes/no; lifetime cap vs 5/week refill

**Next:**
- User answers the 3 open decisions
- Work through Phase 0 checklist in parallel
- Then `npx create-next-app` to start Phase 1.1

**Phase:** 0 — Pre-Build

**Blockers:** None (external accounts user-side)
