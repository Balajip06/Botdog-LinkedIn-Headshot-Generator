# Session Log

Append at end of each session. Newest on top.

## 2026-05-28 — UI/UX redesign: TikTok-native overhaul of consumer flow

**Done (4 phases, 4 commits on master):**

- **Phase A (`ac6711b`)** — MOCK_TRENDS=true dev flag short-circuits repository + authed-area gates with in-memory fixtures (5 trends, 4 generations, mock user/profile). Playwright config gains 4 opt-in visual projects (desktop/mobile × light/dark) gated on `RUN_VISUAL_BASELINE=true`. `e2e/visual-baseline.spec.ts` shoots 10 routes per project = 40 PNGs to `e2e/screenshots/baseline/`. CI default skips visual projects.

- **Phase B (`ac0549f`)** — Token system in `app/globals.css`: oklch surfaces (warm off-white / deep violet ink), hot-pink primary, electric-cyan secondary, brand gradient (pink → orange → gold), radius scale, motion vars + 5 keyframe utilities + reduced-motion guard. shadcn init (`components.json`, alias utils → `@/lib/utils/cn`) + 14 primitives via `shadcn add` (button, card, input, label, select, skeleton, badge, dialog, sonner, separator, accordion, tabs, switch, progress). Brand layer: `Logo` (gradient glyph + Trendly wordmark), `GradientButton` (full-bleed CTA), `ThemeProvider` + `ThemeToggle` (next-themes, mount-safe). Root layout wraps children in ThemeProvider, mounts `<Toaster richColors />`.

- **Phase C (`a489c9e`)** — All 6 consumer surfaces + 3 shells rewritten composing the new primitives:
  - **Public shell**: sticky blurred header, brand logo, footer
  - **App shell**: sticky header + theme toggle + nav
  - **Auth shell**: gradient-spotlight backdrop + glassmorph card
  - **Home**: gradient headline w/ word-clip, featured trend hero card, 3-up masonry, "3 taps" how-it-works strip, staggered fade-up animation
  - **Trend page**: image-forward hero w/ Trending/aspect/model badges, 2-col layout, accordion FAQ via shadcn
  - **Upload form**: native HTML5 drag-drop, preview chips w/ X-remove + createObjectURL cleanup, "Add more" tile, shadcn Input/Label/Select, sonner toast for validation errors
  - **Result page**: status-aware headline, ResultCanvas component w/ pop-in scale + halo glow for completed / shimmer overlay for processing / branded "quota refunded" panel for failed, ShareBurst card w/ 5-tile gradient + outline mix
  - **Login**: gradient "Welcome in" headline, glassmorph card, real Google glyph, magic-link via shadcn Input + GradientButton, sonner errors
  - **Creations**: gradient-clipped headline, status badge overlay per card, empty state w/ gradient icon
  - **Settings**: 3 circular SVG quota meters (CSS conic-gradient via stroke-dasharray), "Most popular" gradient badge on medium pack, ReferralCopyButton client component w/ sonner toast, destructive button on danger zone

- **Phase D (`7819e2f`)** — Re-shoot redesign baseline (40/40 passing) into `e2e/screenshots/redesign/` via `VISUAL_OUTPUT_DIR=redesign`. Two bug fixes caught during verification:
  1. **GradientButton bg invisible**: Lightning CSS / tailwind-merge collapsed `.bg-gradient-hero` in some contexts. Fix: split into a dedicated `.brand-grad` utility class + companion `.brand-glow` (no `bg-*` / `shadow-*` prefix → no twMerge group conflict).
  2. **ShareBurst SSR hydration mismatch**: `window.location.origin` is undefined on server → different href attributes between SSR + CSR. Fix: use `process.env.NEXT_PUBLIC_SITE_URL` which is identical on both.
- `e2e/a11y.spec.ts` w/ `@axe-core/playwright`: scans 6 consumer routes, fails on critical violations. **Zero critical** across all 6.
- `e2e/happy-path.spec.ts`: navigation smoke walking home → trend → login → creations → settings → result-completed → result-processing.
- `e2e/home.spec.ts` updated for new copy.

**Verification (all green):**
- `pnpm typecheck` clean
- `pnpm test` 78/78 across 12 suites
- `pnpm build` clean — 25 routes
- `pnpm exec playwright test e2e/home.spec.ts e2e/a11y.spec.ts e2e/happy-path.spec.ts --project=chromium` 9/9
- `RUN_VISUAL_BASELINE=true VISUAL_OUTPUT_DIR=redesign pnpm exec playwright test e2e/visual-baseline.spec.ts` 40/40

**Stale items / known issues / next-session entry points:**
- Pre-existing lint errors in `ResultView` (set-state-in-effect for `pushHint`) + admin/trends/new (unescaped apostrophes) + 2 unused `_options` in trend source stubs. Not introduced by this redesign — flagged for a separate cleanup pass.
- Hydration warning in dev console from `next-themes` initial class flip — expected (suppressHydrationWarning on `<html>` is in place).
- `MOCK_TRENDS=true` is still set in `.env.local`. Flip to `false` (or remove) when wiring real Supabase + auth flows. Never set in production — proxy.ts + repository.ts both bypass critical auth/data paths when true.
- Phase 4 PostHog events still wired to old class-named surfaces; check that `EVENTS.UPLOAD_STARTED` etc. still fire after the schema-form rewrite (sample manually once real Supabase + Gemini are live).
- shadcn primitives are ejected into `components/ui/` — regenerable via `shadcn add` but customizing means hand-editing those files.

**New deps (devDeps):** `cross-env@^10`, `@axe-core/playwright@^4.11`. Runtime adds: 345 transitive packages via shadcn (radix-ui-*, sonner, etc.).

---

## 2026-05-28 — Phase 3 impl: push notifications + email fallback wired end-to-end

**Done:**
- `app/api/push/subscribe/route.ts` — authed POST. Zod validates standard `PushSubscriptionJSON` shape; accepts `null` to clear. Writes `profiles.push_subscription` (cast-to-`never` until supabase:types lands).
- `app/api/push/dispatch/route.ts` — service-role-bearer authed POST `{ generation_id: uuid }`. Loads gen + profile + trend; tries Web Push first via `sendPush` with deep-link `/result/<id>` + tag `gen-<id>`; on push 404/410 clears stale `profiles.push_subscription` and falls through to email; if no subscription or push terminally fails, sends Resend via `buildResultReadyEmail`. Returns `{ delivered: 'push' | 'email' | 'none' }`.
- `lib/push/client.ts` — `isPushSupported`, `isIosSafariNeedsInstall`, `getPermissionState`, `registerServiceWorker`, `ensurePushSubscription` (asks permission only on `default`, subscribes via PushManager with VAPID public key from `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, POSTs to `/api/push/subscribe`). Discriminated `EnsureResult`: `unsupported | denied | needs_pwa_install | no_vapid_key | subscribe_failed | post_failed`. Type fix: cast `Uint8Array<ArrayBufferLike>` → `BufferSource` at `subscribe()` call site.
- `components/push/PushBootstrapper.tsx` — `'use client'`, mounted once in `app/(app)/layout.tsx`. Calls `registerServiceWorker` on mount only — registration ready for later opt-in.
- `app/(app)/result/[id]/ResultView.tsx` — new effect on `row.status`: first transition to `completed` triggers `ensurePushSubscription` exactly once per mount (`useRef` guard). iOS-Safari-needs-install surfaces grey "Add to Home Screen" hint; denial silent no-op.
- `supabase/functions/generate-image/index.ts` — new `dispatchNotification(generationId)` after marking `completed`. Reads `SITE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from Deno.env, POSTs to `${SITE_URL}/api/push/dispatch` with bearer auth, 8s timeout, failure swallowed (best-effort — Realtime/poll path still works).
- `supabase/functions/generate-image/README.md` — documents new `SITE_URL` secret.

**Verification:**
- `pnpm typecheck` clean
- `pnpm test` 78/78 across 12 suites (unchanged)
- `pnpm build` clean — **19 routes** (added `/api/push/subscribe` + `/api/push/dispatch`)

**Commits:**
- `89310af` feat: phase 3 impl - push notifications + email fallback wired end-to-end

**Phase 3 remaining (user-side only):**
- Deploy Edge Function + set `GEMINI_API_KEY` + `SITE_URL` secrets
- Configure Database Webhook in Supabase Dashboard
- Run 12-test verification runbook in README.md

---

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

## 2026-05-28 — Phase 3 impl loop closed: home grid + trend page upload wiring

**Done:**
- Removed root `app/page.tsx` placeholder (would collide with new `app/(public)/page.tsx` since route groups don't add URL segments)
- `app/(public)/page.tsx` — public home grid RSC. Queries `listActiveTrends()` from repository. `revalidate = 600` (10-min ISR). Responsive 2/3/4-col grid. Falls back to text-only card when no thumbnail or sample image. Empty-state copy when no active trends.
- `app/(public)/trend/[slug]/TrendUpload.tsx` — `'use client'` glue component. Receives `trendSlug` + `schema` props. `onSubmit` callback wires the full upload→generate→nav flow:
  1. `supabase.auth.getUser` → redirect `/login?next=/trend/<slug>` if not signed in
  2. `generateIdempotencyKey()` (32 hex chars)
  3. Per image field × per file: `prepareImageForUpload` (HEIC dynamic-import, OffscreenCanvas resize to ≤2048, JPEG 0.9) → `supabase.storage.from('uploads').upload(${userId}/${idemKey}/${fieldName}_${idx}.jpg)` → `createSignedUrl(path, 3600)` (1h TTL — comfortable cushion for Edge Function fetch)
  4. Replace file-field entries in `values` with signed URLs (string for max_count=1, string[] otherwise)
  5. POST `/api/generate` with `idempotency-key` header + `{ trend_slug, values }` body
  6. `router.push(`/result/${generation_id}`)` on success
  Error path surfaces red message under form and resets `submitting`
- `app/(public)/trend/[slug]/page.tsx` — replaced "Phase 3 placeholder" paragraph with `<TrendUpload trendSlug={trend.slug} schema={trend.input_schema} />`. SEO/metadata/JSON-LD/FAQ unchanged.

**Cache lesson:**
After deleting `app/page.tsx`, `.next/types/validator.ts` still referenced the removed module and `tsc` failed (`Cannot find module '../../app/page.js'`). Cleared `.next/` cache; subsequent typecheck + build clean.

**Verification:**
- `pnpm typecheck` clean
- `pnpm test` 78/78 across 12 suites (unchanged)
- `pnpm build` clean — 17 routes; `/` is now dynamic (ƒ) due to Supabase query in RSC, ISR keeps cache hot

**Commits:**
- `919e136` feat: phase 3 impl - close user-flow loop (home grid + trend page upload wiring) [amended; original commit-msg.txt write had failed silently producing wrong subject; safe to amend since local-only + fresh]
- `2f7f6b7` chore: log phase 3 user-flow loop closed

**End-to-end navigable flow (once creds in):**
home grid (ISR 10m) → trend page (ISR 1h) → SchemaForm → upload + sign → /api/generate → DB webhook → Edge Function → Gemini → upload outputs → UPDATE generations → Realtime → result page → download

---

## 2026-05-28 — Phase 3 impl: storage buckets + Deno Edge Function + result page Realtime + retry

**Done:**
- `supabase/migrations/20260528000002_storage_buckets.sql` — idempotent bucket creation: `uploads` (private), `outputs` (public). RLS policies: uploads self-folder insert/read/delete (auth.uid() prefix match); outputs public-read + service-role write+delete only
- `supabase/functions/generate-image/index.ts` — Deno Edge Function. Self-contained (no Node imports); inlines `interpolate`, `collectImagesFromValues`, Gemini call, base64 codec, cost map, model id map. Flow:
  1. Verify `Authorization: Bearer <service-role-key>` (webhook auth, not user JWT)
  2. Parse webhook payload, ignore non-INSERT or non-`generations`-table
  3. Conditional `UPDATE generations SET status='processing', attempts=attempts+1 WHERE id=? AND status='pending'` — atomic claim that prevents double-processing on Supabase webhook retries
  4. Fetch trend row (prompt_template, model, aspect_ratio, version)
  5. Build prompt; collect image URLs from `input_payload.image_urls` (set by /api/generate) or fallback `collectImagesFromValues`
  6. Call Gemini with all 4 safetySettings at `BLOCK_MEDIUM_AND_ABOVE`, 90s AbortController timeout
  7. Upload output PNG to `outputs/{user_id}/{gen_id}.png` via service-role client
  8. UPDATE generations SET status='completed', output_image_url, cost_usd, model_used, completed_at
  Failure taxonomy:
    - safety → terminal `failed` (DB trigger refunds quota)
    - timeout/transient/upload error → `failed_retryable` until `attempts ≥ 3` then terminal `failed`
- `supabase/functions/generate-image/README.md` — deploy command (`pnpm supabase functions deploy generate-image --no-verify-jwt` — flag required because webhook posts service-role key, not user JWT), secret list (`GEMINI_API_KEY`), Database Webhook config (table=generations, event=INSERT, method=POST, URL+Authorization header), local-testing curl
- `app/(app)/result/[id]/page.tsx` — server shell: auth gate → redirect /login?next; fetch initial row + 404 on not-own (`notFound()` hides id existence); fetch trend slug+title for back-link
- `app/(app)/result/[id]/ResultView.tsx` — `'use client'` Realtime + retry:
  - `useEffect` subscribes to `postgres_changes` UPDATE on generations filter `id=eq.<id>`; exits early if status already terminal; `removeChannel` on unmount
  - Retry button reuses original `Idempotency-Key` from row → duplicate-key replay path in `/api/generate` returns existing row without consuming quota
  - Pills: pending / processing / completed / failed_retryable (shows attempts) / failed
  - Download link to `/api/download/<id>` on completed
  - Skeleton spinner + failure panel with error message
- `tsconfig.json` — added `supabase/functions/**` to exclude. Edge Function uses URL imports + Deno globals; tsc must skip it
- Windows vitest `spawn UNKNOWN` flake captured for lessons.md (transient; re-run usually clean)

**Verification:**
- `pnpm typecheck` clean
- `pnpm test` 78/78 across 12 suites (first run flaked on Windows ForksPool spawn-UNKNOWN — re-ran clean)
- `pnpm build` clean — **17 routes** (added `/result/[id]`)

**Commits this session:**
- `27afe7f` feat: phase 3 impl - storage buckets, Deno Edge Function, result page Realtime + retry

**Phase 3 implementation remaining (mostly user-side):**
- Wire `SchemaForm` into trend page (client component split + Storage upload + POST + result-page nav)
- Service worker registration + push permission UX (after first completion)
- Push + email fallback from Edge Function on completion
- Deploy Edge Function + set `GEMINI_API_KEY` secret + configure Database Webhook in Supabase Dashboard

---

## 2026-05-28 — Phase 6 prep: auto trend detector sources + proposer + orchestrator + admin inbox

**Done:**
- `lib/trends/sources/types.ts` — common `TrendCandidate` (source, external_id, title, description, exemplar_urls, momentum_score, source_url, observed_at) + `SourceFetcher` + `SourceFetchOptions { limit?, minMomentum? }`
- `lib/trends/sources/tiktok.ts` — stub; returns `[]` unless `TIKTOK_CREATIVE_CENTER_KEY` set. TODO points to TikTok Creative Center API
- `lib/trends/sources/instagram.ts` — stub; returns `[]` unless `INSTAGRAM_SESSION_COOKIE` set. Production path noted as scrape + Playwright + rotating proxies (grey-area)
- `lib/trends/sources/reddit.ts` — working fetcher. Polls public `r/<sub>/top.json?t=day` across 5 image-creator subs (midjourney, StableDiffusion, AIGeneratedArt, Pics, PhotoshopRequest), filters NSFW + stickied, momentum = upvotes / hour-since-creation (clamped age ≥ 1h to avoid divide-by-zero spikes), sorts desc, returns top N. Per-sub try/catch — one failing sub doesn't poison the run
- `lib/trends/suggestions/payload.ts` + test (8 cases) — Zod discriminated union (`type: 'auto' | 'user'`) for `trend_suggestions.payload` JSONB column. `AutoSuggestionPayload` packs `candidate + proposal { suggested_slug (kebab-case), suggested_title, suggested_description, prompt_template (>=10 chars), model (enum), input_schema (reuses TrendInputSchema), proposer_model, confidence (0..1) }`. `UserSuggestionPayload` packs `submitted_by (uuid), title, description, example_urls (>=1)`. Tests cover slug rule, confidence bounds, min prompt length, model enum, missing example URLs, unknown discriminator
- `lib/trends/proposer.ts` + test (7 cases) — `Proposer` interface + `mockProposer` (deterministic stub producing plausible Proposal so admin inbox + approval flow exercise end-to-end without API calls). `slugify` helper exported (lowercase, alnum-only, hyphen-collapse, 80-char cap, `trend-<ts>` fallback when input empty). `getProposer()` returns mock when `GEMINI_API_KEY` absent
- `lib/trends/orchestrator.ts` — `runTrendDetector(supabase, options)`: parallel `Promise.all` source fetch with per-source try/catch into errors array; dedup vs pending `trend_suggestions` rows by `source:external_id` (parses existing payload JSON); calls proposer per fresh candidate; inserts row with `source='auto'` + the typed payload; returns `{ fetched, deduped, proposed, inserted, errors }` so the cron job can alert on regressions
- `app/admin/suggestions/page.tsx` — admin inbox RSC, `dynamic = 'force-dynamic'`, lists 100 most-recent pending rows, `TrendSuggestionPayloadSchema.safeParse` per row (failed parse → red banner for admin attention), shows momentum + confidence + source link for `type='auto'` and title/description for `type='user'`. Approve/Reject buttons visible-but-disabled (Phase 6 impl will wire server actions)
- Zod 4 strict UUID quirk noted: v4 UUIDs require version-4 + variant-8 bytes (`xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx`); `'00000000-0000-0000-0000-000000000001'` fails validation in Zod 4

**Verification:**
- `pnpm typecheck` clean
- `pnpm test`: 78/78 across 12 suites (+15 cases this turn — 8 payload, 7 proposer)
- `pnpm build` clean — **16 routes** total (added `/admin/suggestions`)

**Commits this session:**
- `9b0aa97` feat: phase 6 prep - auto trend detector sources, LLM proposer, orchestrator, admin inbox

**Phase 6 implementation (blocked):**
- Real TikTok fetcher (Creative Center API + business account)
- Real Instagram fetcher (Playwright + rotating proxies)
- Real Gemini-Flash proposer with structured JSON output
- Approve / Reject server actions in admin inbox + linking to draft trend
- Supabase pg_cron daily job calling `runTrendDetector`
- Manual "Scan for trends" admin button → POST endpoint → orchestrator

---

## 2026-05-28 — Phase 5 prep: credit packs + Stripe checkout + webhook grant dispatcher + grant_credits SQL fn

**Done:**
- `supabase/migrations/20260528000001_grant_credits.sql` — SECURITY DEFINER `grant_credits(uuid, int, text, text)`. Validates amount > 0, increments `profiles.credits_balance` (skips deleted), writes `admin_audit_log` row with `{ source, source_ref }` (so refunds + manual grants leave a trail). Execute privilege restricted to `service_role` — public users cannot call.
- `lib/payments/packs.ts` + test (12 cases) — `CREDIT_PACKS` constant array of three `CreditPack` interfaces matching amended plan §"Pricing" R6: small=$4.99/50, medium=$14.99/200, large=$39.99/600. Volume-discount invariant tested. `findPack(id)` lookup, `isPackId` type guard, `requirePackPriceId(pack)` resolves `STRIPE_PRICE_ID_*` from env and throws when missing so misconfigured deploys fail loudly at first checkout.
- `lib/payments/credits.ts` — `grantCredits(supabase, { userId, amount, source, sourceRef })` wraps `supabase.rpc('grant_credits', …)`. Idempotency note in docstring: enforcement lives in `webhook_events.event_id` unique constraint, not in this fn.
- `app/api/stripe/checkout/route.ts` — Node runtime authed POST: Zod-validates `pack_id`, creates `Stripe.checkout.sessions` with `client_reference_id=user.id` + metadata `{ user_id, pack_id, credits }`. Metadata is the join key the webhook uses to grant — keeps logic portable across test/staging/prod (price ids differ per env). Success URL → `/me/creations?purchase=success&pack=…`, cancel URL → `/me/settings?purchase=cancelled`.
- `app/api/stripe/webhook/route.ts` — rewrote the Phase 1 stub into the full dispatcher:
  1. `webhook_events` insert (idempotency gate) — duplicate-key returns `{received: true, duplicate: true}` 200
  2. `handleEvent(event)` switch on `event.type`
  3. `handleCheckoutCompleted(session, eventId)` extracts metadata, calls `grantCredits` with `source='stripe'` and `sourceRef=event.id`
  4. After success, stamp `webhook_events.processed_at = now()`
  5. Handler throw → 500 so Stripe retries (event_id stays in DB; same event_id replay will short-circuit on the duplicate-key path, so retries are safe)
- `.env.local.example` + `lib/env.ts` — `STRIPE_PRICE_ID_SMALL`, `STRIPE_PRICE_ID_MEDIUM`, `STRIPE_PRICE_ID_LARGE` slots (optional in Zod schema during dev)

**Verification:**
- `pnpm typecheck` clean
- `pnpm test`: 63/63 across 10 suites (+9 cases this turn — packs)
- `pnpm build` clean — **15 routes** total (added `/api/stripe/checkout`)

**Commits this session:**
- `ef3922e` feat: phase 5 prep - credit packs, checkout session, webhook grant dispatcher, grant_credits sql fn

**Phase 5 implementation (blocked on Stripe account):**
- Create 3 Stripe products + one-time prices in test mode, paste IDs into `.env.local`
- Configure Stripe webhook → `/api/stripe/webhook` + signing secret in env
- Settings/checkout UI surface — button on `/me/settings` POSTs to `/api/stripe/checkout` + redirects to returned `checkout_url`
- Support refund flow — depends on Phase 2 admin CRUD
- Daily margin dashboard, Gemini billing alerts (post-launch)
- Verification: duplicate webhook → 1 grant only; refund flow works

---

## 2026-05-28 — Phase 4 prep: virality primitives, watermark composer, history + settings, download route

**Done:**
- `sharp` ^0.34.0 added as dep (native image composition for server-side watermark; Vercel + Node API-route compatible)
- `lib/analytics/events.ts` — 15-event typed PostHog catalog with per-event payload interfaces; generic `track<E>(posthog, event, payload)` enforces payload shape at call site without hard-importing posthog
- `lib/share/web-share.ts` + test — `shareNative` (prefers web-share-files for Android Chrome + iOS Safari 17+, falls back to url-only on older mobile, swallows `AbortError` as `'cancelled'`), `buildTwitterShareUrl` (x.com/intent/tweet), `buildWhatsappShareUrl` (wa.me), IG + TikTok native deep-link constants, `copyToClipboard` fallback
- `lib/referrals/links.ts` + test (12 cases) — `buildReferralUrl(siteUrl, code, path?)`, `parseReferralFromUrl`, `parseReferralFromCookie`; 12-hex code validation matches migration 0001's `profiles.referral_code` default (`encode(gen_random_bytes(6), 'hex')`); `REFERRAL_COOKIE_NAME='tig_ref'` + 30-day max-age
- `lib/watermark/compose.ts` + test (4 cases) — sharp-based `applyWatermark(buffer, options?)`: bottom-right pill-shaped SVG overlay composited via `sharp.composite({ gravity: 'southeast' })`; font size scales linearly with longest side (1024 → 22px, 4096 → 88px); custom wordmark override; opacity default 0.85; XML-escaped wordmark text to handle special chars from trend names safely; output dimensions preserved verified via metadata round-trip
- `app/(app)/layout.tsx` — authed-area shell with header nav (`/me/creations`, `/me/settings`) + max-w-5xl content area, dark-mode aware
- `app/(app)/me/creations/page.tsx` — RSC, `dynamic = 'force-dynamic'`, queries 60 most-recent generations by user via authed Supabase client, grid layout (2 / 3 / 4 cols responsive), pending/processing/failed status placeholder for non-completed rows
- `app/(app)/me/settings/page.tsx` — RSC, force-dynamic; quota panel (free 5/week + credits + bonus 50-cap); referral link via `buildReferralUrl`; danger-zone soft-delete via Server Action that sets `profiles.deleted_at = now()` + `supabase.auth.signOut()` + redirect home
- `app/api/download/[id]/route.ts` — Node-runtime authed download: ownership check, `status='completed'` gate, fetches `output_image_url` from Storage, checks `profiles.credits_balance > 0` to determine Pro vs Free, applies `applyWatermark` on Free, streams PNG with `content-disposition: attachment; filename=trend-<id>.png` and `cache-control: private, no-store`

**Verification:**
- `pnpm typecheck` clean
- `pnpm test`: 54/54 across 9 suites (+18 cases this turn — 3 web-share, 12 referral, 4 watermark, plus minor)
- `pnpm build` clean — **14 routes** total: `/`, `/_not-found`, `/api/download/[id]`, `/api/generate`, `/api/generate-anonymous`, `/api/stripe/webhook`, `/auth/callback`, `/login`, `/me/creations`, `/me/settings`, `/robots.txt`, `/sitemap.xml`, `/trend/[slug]`, `/trend/[slug]/opengraph-image-*`

**Commits this session:**
- `876648d` feat: phase 4 prep - virality primitives, watermark composer, history + settings, download route

**Phase 4 implementation (blocked):**
- Referral signup-cookie wiring (landing→cookie→signup→referrals row); reward trigger already exists in migration 0004
- PostHog provider + `track()` calls at 15 event points
- Data export Server Action on settings (zip of profile + generations rows)
- Anomaly alert (PostHog funnel >5 gens/hr) — post-launch
- Turnstile on signup — needs Turnstile site key

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
