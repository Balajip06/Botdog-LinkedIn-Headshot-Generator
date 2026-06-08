# Changelog

All notable changes to Botdog are documented here. (Entries before the 2026-06-05 pivot reference the project's prior name, "Trendly".)

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: pre-release; no semver guarantees until `1.0.0`. Dates are in ISO 8601 (`YYYY-MM-DD`).

---

## [Unreleased] — 2026-05-29

Phase 7–10 feature absorption + buyer diligence dashboards + repo-root documentation pass. All work tracked here lands on `main` ahead of the W6 cred-acquisition window.

### Added

- **Favorites + history search** on `/me/creations` — toggle favorite via `generations.is_favorite`, search by trend slug + date range; backed by migration `20260529000007_generations_favorites_search.sql`
- **Multi-photo upload UI** in the schema-driven form — accepts `max_count > 1` from `trends.input_schema`, with per-file preview chips, X-remove, and HEIC dynamic-import
- **Trend scheduling** — `trends.publish_at` and `trends.deactivate_at` columns + admin scheduler UI + pg_cron auto-deactivate job (migration `20260529000010_pg_cron_auto_deactivate.sql`)
- **Trend cloner** — admin one-click clone of an existing trend (input_schema, prompt, FAQ all forked) for variant testing
- **Featured trend flag** — `trends.is_featured` surfaces the hero card on the home grid
- **Trend leaderboard** — admin view ranking trends by generations / shares / completion-rate / revenue contribution
- **VIP user flag** — `profiles.is_vip` bypasses the weekly-5 quota; quota-block trigger respects the flag (migration `20260529000006_profiles_vip.sql` + `20260529000009_quota_trigger_vip_and_alert.sql`)
- **Quota-block alert metric** — admin dashboard surfaces the count of quota-blocks per day; alert fires when the rate spikes above the 7-day rolling average
- **Marketing spend tracking** — admin entry surface + per-channel cohort attribution (migration `20260529000011_admin_marketing_spend.sql`)
- **Acquisition source attribution** — `profiles.acquisition_source` captured on signup from referrer + UTM (migration `20260529000003_profiles_acquisition_source.sql`)
- **First-purchase discount flag** — `profiles.first_purchase_discount` enables Stripe coupon eligibility (migration `20260529000004_profiles_first_purchase_discount.sql`)
- **Trend share caption** — `trends.share_caption` overrides the default "Made with Trendly" Web Share text (migration `20260529000005_trends_share_caption.sql`)
- **Trend discovery cron** — pg_cron job polls the Reddit source nightly into the admin suggestions inbox (migration `20260529000012_pg_cron_trend_discovery.sql`)
- **Refund UX polish** on `/admin/refunds` — bulk-select + reason templates + confirm dialog before write
- **4 buyer diligence dashboards** — Engagement / Margin (revenue cohorts + unit economics) / Users (WAU / DAU + funnel + retention) / Quota blocks
- **Repo-root docs** — fresh `README.md`, new `SECURITY.md`, new `CONTRIBUTING.md`, new `CHANGELOG.md` (this file)

### Changed

- Test suite grown from 343 to 404 passing across 43 files
- Route count grown from 30 to 50 built routes (admin diligence surfaces account for most additions)
- Default Tailwind theme tokens tightened — oklch primaries unchanged, but mid-tone grays re-derived for AA contrast across both light + dark modes
- Admin nav re-grouped: Trends / Suggestions / Users / Engagement / Margin / Quota / Refunds / VIP / Audit / Export / Marketing

### Fixed

- ShareBurst SSR hydration mismatch resolved (`process.env.NEXT_PUBLIC_SITE_URL` replaces `window.location.origin` for SSR-safe URLs)
- `bg-gradient-*` custom utility names no longer collide with tailwind-merge groups (now `.brand-grad` + `.brand-glow`)
- Empty admin FAQ + `input_schema` fields no longer break trend create/update — optional vs. required branch fixed in `app/admin/trends/actions.ts`

### Security

- ToS acceptance now persisted to `profiles.tos_accepted_at` (migration `20260529000001_tos_acceptance.sql`); admin audit log records when the flag flips
- Audit log surface for VIP flag flips — every `profiles.is_vip` change records actor + before/after via the standard `logAdminAction()` helper

---

## [0.4.0] — 2026-05-29

Initial sellable-asset scope (W0 through W5 of the sellable plan). Transformed the MVP foundation into a buyer-ready package: legal templates, transferability documentation, ADRs covering load-bearing decisions, SOPs covering operations, data-room scaffold, provider abstraction.

### Added

- **Provider abstraction** — `lib/image-provider/index.ts` exposes a single `generateImage()` shim; Gemini is the default, OpenAI is wired as a stub. Switching providers is a one-env-var change (`IMAGE_PROVIDER=openai`)
- **Event store** — `trend_events` table captures every state transition (view / upload / generate / share / refund / etc.); migration `20260529000002_trend_events.sql`
- **`KpiCard` component** extracted from the admin dashboard for reuse across all 4 diligence surfaces
- **Anonymous trial with real fingerprint data** — `@fingerprintjs/fingerprintjs` integrated; `(fingerprint_hash, ip_hash)` enforces single-shot anonymous attempts at the DB layer with $20/day global cost ceiling
- **`/not-found` + `/error` + `/health` + `/manifest.json`** — production-grade default surfaces
- **Public legal routes** — `/terms` + `/privacy` rendered from `docs/TERMS_OF_SERVICE.md` + `docs/PRIVACY_POLICY.md`
- **Cookie consent banner** — GDPR-compliant, stores choice in `localStorage`, gates PostHog initialization
- **7 ADRs** — credit packs vs. subscription, RLS quota strategy, schema-driven trend inputs, eval gate constraint, idempotency strategy, soft-delete cascade, anonymous trial architecture
- **5 SOPs** — daily ops, incident response, refund handling, weekly new-trend workflow, takedown handling
- **Legal templates** — DPA + sub-processor list (GDPR Article 28 compliant) in `docs/legal/`
- **Transferability documentation** — per-account transfer plan + post-acquisition timeline in `docs/transferability/`
- **Press kit** — sell sheet + launch thread templates for 7 platforms + founder bio templates in `docs/press-kit/`
- **Data room scaffold** — full buyer-facing folder structure at `docs/data-room/` with section-level READMEs
- **Sentry day-1 integration** — error capture + perf monitoring + source-map upload; PII scrubbing pre-ingest

### Changed

- `master` branch renamed to `main`
- Test suite grown from 78 to 343 passing
- Route count grown to 49 built routes
- Listing range recalibrated from $150K–$300K (fantasy) to $50K–$75K (comps-derived 1.0x–1.5x multiple) per the sellable-plan ultrareview
- Admin dashboard re-themed for buyer demos — consistent KPI cards, hover states tightened

### Removed

- Hardcoded mock data paths in `/admin/*` — every admin surface now reads from real Supabase (when `MOCK_TRENDS=false`)

### Security

- Per-IP rate limiter wired to Upstash Redis with graceful no-op fallback when creds are missing
- `lib/env.ts` Zod schema enforces required vars at boot — fail-loud beats fail-silent
- Anonymous daily abuse budget enforced server-side — anonymous mode auto-disables when exceeded

---

## [0.3.0] — 2026-05-28

MVP foundation: admin CRUD + eval workflow + virality polish + Stripe checkout UI. The point at which the codebase first became feature-complete pending creds.

### Added

- **Admin CRUD for trends** with JSONB schema editor + dynamic form preview + FAQ editor + reference image upload
- **Eval workflow** — admin grid runs N reference inputs through the current prompt, marks the trend `eval_status='passed'` only after 80% positive review; DB constraint blocks `is_active=true` without `eval_status='passed'`
- **Watermark composer** — server-side `lib/watermark/` composes a corner-stamped watermark on free-tier downloads; Pro removes
- **Web Share API** integration on the result page (`ShareBurst`) — 5-tile gradient share targets with native share fallback
- **Referrals** — referral codes, redemption gate (must complete first generation), farming guard (`bonus_credits_earned` capped at 50)
- **Generation history** at `/me/creations` with status badges, download buttons, delete (soft) action
- **Soft-delete + data export** — `profiles.deleted_at` cascades; `/api/me/export` returns the full Article-15 JSON payload; pg_cron hard-deletes after 30 days
- **Branded Open Graph cards** via `@vercel/og` — per-trend SEO-ready cards with brand gradient
- **JSON-LD `HowTo`** schema on every `/trend/[slug]` page
- **`sitemap.xml` + `robots.txt`** generated dynamically from the trends table
- **Stripe Checkout UI** on `/me/settings` — three credit-pack cards ($4.99 / $14.99 / $39.99) with "Most popular" badge on the medium pack
- **Stripe webhook handler** with idempotent dedup via `webhook_events.event_id` unique constraint
- **PostHog product analytics** — 15-event funnel from anonymous visit through paid conversion
- **PWA manifest + service worker** — Add-to-Home-Screen on iOS Safari unlocks Web Push

### Changed

- UI/UX redesign (Phases A–D) — TikTok-native overhaul of the consumer flow, oklch token system, 14 shadcn primitives ejected into `components/ui/`, brand layer (`Logo`, `GradientButton`, `ThemeProvider`)
- Migrated to Next.js 16.2.6 + React 19.2.4 + Tailwind v4 (CSS-first, no config file)
- `middleware.ts` → `proxy.ts` (Next 16 convention)

### Fixed

- HEIC images now convert to JPEG client-side before upload via dynamic `heic2any` import (keeps the bundle clean for non-iOS users)
- Trend page hydration mismatch on dynamic FAQ accordion resolved

---

## [0.2.0] — 2026-05-27

Authentication + schema + RLS quota. The first production-shaped slice.

### Added

- **Supabase Auth** — Google OAuth + magic-link email sign-in
- **Schema migrations** — `profiles`, `trends`, `generations`, `referrals`, `push_subscriptions`, `webhook_events`, `admin_users`, `admin_audit_log`
- **RLS policies** on every user-facing table — `auth.uid()` scoping for `profiles` + `generations`; admin-only for `trends` writes; service-role-only for `webhook_events`
- **RLS-enforced free-tier quota** — DB trigger blocks `generations` INSERT when `free_used_this_week >= 5 AND credits_balance <= 0`
- **pg_cron weekly refill** — every Sunday 00:00 UTC, `profiles.free_used_this_week` resets to zero
- **Admin gating** — `admin_users` table + middleware check; non-admins get a 404 on `/admin/*`
- **Admin audit trigger** — every write to admin-managed tables fires a DB trigger that inserts into `admin_audit_log`
- **`/api/generate` idempotency** — `Idempotency-Key` header dedups duplicate POSTs in a 24-hour window
- **Edge Function `generate-image`** — Deno-based, claims the row atomically, calls Gemini, uploads output, updates row; Database Webhook triggers it on `generations` INSERT
- **Realtime subscription** on the result page — listens for the `pending → processing → completed` transitions
- **Retry + refund logic** — `attempts < 3` retries on transient errors; safety rejections refund the quota slot

### Security

- All env vars validated through the Zod `ServerEnvSchema` at boot
- Service-role key isolated to server-only modules (`lib/supabase/service.ts`)
- Stripe webhook signature verification before processing

---

## [0.1.0] — 2026-05-25

Project kickoff. Repo scaffolded, plan documented, conventions locked.

### Added

- Next.js 16 + React 19 + TypeScript 5 + Tailwind v4 scaffold
- Supabase CLI integration (`pnpm supabase ...`)
- ESLint 9 flat config + Prettier 3 + prettier-plugin-tailwindcss
- Vitest + Playwright + `@axe-core/playwright` test stack
- GitHub Actions CI workflow (`ci.yml`) — typecheck + lint + test + build
- `CLAUDE.md` project instructions with non-negotiables, active skills, agents, folder structure
- Original product plan (`trend-image-app-plan.md`) + amended plan (`.claude/plans/`)
- `.claude/todo.md` + `.claude/session-log.md` + `.claude/lessons.md` (per-session journals)
- Issue templates (`bug.md`, `trend_suggestion.md`) + PR template + issue config redirecting refund / IP / security off-GitHub
- `LICENSE` (Proprietary)
- `.env.local.example` with every env var documented

---

## Format

Each release section uses the Keep-a-Changelog groupings: **Added**, **Changed**, **Fixed**, **Removed**, **Security**, **Deprecated**. Pre-`1.0` minor bumps gather buyer-relevant milestones; patch versions are not tracked here (every commit on `main` is potentially shipped via Vercel auto-deploy).
