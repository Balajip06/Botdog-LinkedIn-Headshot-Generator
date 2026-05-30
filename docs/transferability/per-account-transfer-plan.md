# Per-Account Transfer Plan

**Last updated:** 2026-05-29
**Authority:** Operationalizes the transferability section of the sellable-asset plan.
**Cross-reference:** [`docs/CREDENTIALS.md`](../CREDENTIALS.md) — for each env var that an account underwrites, what the var unlocks, and what breaks if it is missing during the cutover.

This document is the per-account playbook for transferring every credential, account, and external asset that Trendly depends on from the seller (`balaji@kimp.xyz`) to the buyer. It assumes a friendly cooperative transfer — both parties want this to go smoothly. For each account it lists: the transfer mechanism, the realistic ETA in calendar days, known risks and gotchas, and what the buyer needs to have ready before the transfer can begin.

Pair this with [`docs/transferability/post-acquisition-timeline.md`](./post-acquisition-timeline.md) for the day-by-day sequencing across all accounts.

---

## Summary table

| Account | Transfer mechanism | ETA (calendar days) | Risk |
|---|---|---|---|
| GitHub repo | Transfer Ownership / Add Buyer as Owner | < 1 day | LOW |
| Vercel project | Add buyer to team / transfer project | 1-2 days | LOW |
| Supabase project | Transfer Ownership (org or project) | 1-3 days | LOW |
| Google Gemini (API key) | Rotate to buyer's GCP project | 1-2 days | LOW (key rotation) |
| Stripe account | Account Transfer Form (KYC required) | 4-7 days | MEDIUM (KYC + gap window) |
| Resend account | Add buyer + transfer ownership | 1-2 days | LOW (DKIM re-verify) |
| VAPID keys | Hand off existing keypair | < 1 day | LOW (do not rotate) |
| Cloudflare Turnstile | Create new keys in buyer account | < 1 day | LOW (env-swap) |
| Cloudflare DNS | EPP / domain transfer | 5-7 days | MEDIUM (auth-code) |
| PostHog | Add buyer + transfer | 1-2 days | LOW |
| Sentry | Add buyer as owner | < 1 day | LOW |
| Upstash | Add buyer + transfer database | < 1 day | LOW |
| Domain registrar | EPP transfer between registrars (or stay) | 5-7 days | MEDIUM (auth-code, ICANN 60-day lock) |
| X / Twitter handle | Email transfer (founder-to-founder) | 1-3 days | MEDIUM (squatter risk) |
| Instagram handle | Email change + business account transfer | 1-3 days | MEDIUM (squatter risk) |
| TikTok handle | Email change | 1-3 days | MEDIUM (squatter risk) |
| Threads handle | Tied to Instagram | with IG | tied to IG |

---

## App + infrastructure accounts

### GitHub repository (Balajip06/Trend-Image-Generator)

- **URL:** https://github.com/Balajip06/Trend-Image-Generator
- **Currently held by:** `balaji@kimp.xyz` (personal account, repo private).
- **Transfer mechanism:**
  1. Buyer creates a GitHub organization (or uses an existing one).
  2. Seller goes to repo Settings → "Transfer ownership" → paste buyer's org or username → confirm via password.
  3. Buyer accepts the transfer (email link or in-app banner).
  4. Seller is removed from collaborators after handover. Optionally retained as a read-only collaborator for the 30-day advisory window.
- **ETA:** Same day. The "Transfer ownership" flow is instant; the buyer's accept is the only delay.
- **Risks:**
  - GitHub Actions secrets do not transfer — buyer must re-add `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `SENTRY_AUTH_TOKEN`, etc. as repo secrets. List comes from `.github/workflows/ci.yml` plus [`docs/CREDENTIALS.md`](../CREDENTIALS.md).
  - GitHub does not transfer Issues' assignees or Project board association — buyer should pre-create the org Project board.
  - Vercel's GitHub integration is per-org; buyer's Vercel project must re-link to the transferred repo.
- **Buyer pre-requisites:**
  - Active GitHub account or organization.
  - Decided which environment-level secrets they'll re-issue vs share (seller's keys vs buyer's keys for each vendor).

### Vercel project (`trend-image-generator` or buyer-renamed)

- **URL:** https://vercel.com/<seller-team>/trend-image-generator
- **Currently held by:** `balaji@kimp.xyz` on the seller's personal team.
- **Transfer mechanism:**
  1. Option A — invite buyer as Owner on the seller team, then seller leaves. Buyer keeps the same team. Cleanest for preserving project history and domain associations.
  2. Option B — buyer creates a new Vercel team; seller initiates Project Transfer from current team → buyer's team. This is a Vercel-supported flow (Settings → General → Transfer Project).
- **ETA:** 1-2 days. Option A is instant; Option B requires both parties online and the buyer team to be on a paid plan if the project uses paid features (e.g., usage > Hobby tier).
- **Risks:**
  - Production environment variables do **not** transfer with the project. Buyer must re-add every env var listed in [`docs/CREDENTIALS.md`](../CREDENTIALS.md) to the new team's project settings.
  - Domain associations remain with the project but require re-verification of the domain owner (if DNS transfers too — see Cloudflare DNS row).
  - Vercel KV / Postgres add-ons (not used today but listed for completeness) would need separate transfer.
  - Analytics history (Vercel Speed Insights, Web Analytics) is preserved when the project is transferred to a new team but is lost if the project is recreated. Always prefer the in-place transfer.
- **Buyer pre-requisites:**
  - Vercel team on a plan that supports the production usage tier.
  - GitHub repo transfer completed first (so the buyer can link the integration).

### Supabase project

- **URL:** https://supabase.com/dashboard/project/<project-ref>
- **Currently held by:** `balaji@kimp.xyz` on the seller's organization.
- **Transfer mechanism:**
  1. Recommended — invite the buyer as an Owner on the seller's organization, then seller leaves the org. The project stays in the same org which preserves project-ref, all keys, and the database URL.
  2. Alternative — Supabase support-mediated project transfer between organizations. Supabase supports this via a written request to support@supabase.com; the project-ref is preserved, but expect 2-3 days while support processes.
- **ETA:** 1-3 days. Owner-invite is instant; org transfer requires Supabase support response.
- **Risks:**
  - `SUPABASE_SERVICE_ROLE_KEY` should be rotated post-transfer. Buyer regenerates via Dashboard → Project Settings → API → Reset service_role key. After rotation, every consumer of the old key (Vercel env, GitHub Actions secrets, the Edge Function secrets) must be re-set.
  - Edge Function secrets (`GEMINI_API_KEY`, `SITE_URL`) are stored separately from `.env.local` via `pnpm supabase secrets set`. Buyer must re-set them in the post-transfer org.
  - The `pg_cron` jobs continue running across the transfer; no action needed unless the database is paused mid-transfer.
  - Authentication providers (Google OAuth) are configured at the project level. The redirect URI references the project-ref (which is preserved in Option 1), so no Google Cloud Console change is required if the project-ref doesn't change.
- **Buyer pre-requisites:**
  - Supabase organization with billing set up (Trendly runs on Supabase Pro — buyer's org needs the Pro plan to inherit production limits).
  - Decision on whether to rotate the service-role key during transfer (recommended) or after (acceptable if the cutover window is < 24 hours).

### Google Cloud / Gemini API

- **URL:** https://aistudio.google.com/ + https://console.cloud.google.com/
- **Currently held by:** `balaji@kimp.xyz` Google account; API key issued under the seller's GCP project.
- **Transfer mechanism:** Gemini API keys are not transferable between Google accounts. The clean approach:
  1. Buyer creates their own GCP project and generates a new Gemini API key.
  2. Buyer pastes the new key into Vercel production env (`GEMINI_API_KEY`) and Supabase Edge Function secrets (`pnpm supabase secrets set GEMINI_API_KEY=... --project-ref <ref>`).
  3. Seller's old key remains valid for the 30-day advisory window as a fallback, then is revoked.
- **ETA:** 1-2 days. Key generation is instant; the slow step is waiting out the rate-limit warm-up on the new key (Google sometimes throttles new keys for ~24 hours).
- **Risks:**
  - **Quota carryover** — billing thresholds and quota allotments are per-GCP-project. Buyer's new project starts with default quotas, which may be lower than seller's project's accumulated quota. If production traffic exceeds the default, buyer must request a quota increase from Google Cloud Console (typically 1-3 business days for approval).
  - **Cost reporting** — historical Gemini cost data stays with the seller's GCP billing account. Buyer needs to plan for separate cost tracking post-cutover.
  - **Region availability** — if seller and buyer are in different regions, Gemini's Nano Banana Pro pricing and availability may differ. Verify against the current pricing page before key swap.
- **Buyer pre-requisites:**
  - Google Cloud account with billing enabled.
  - Cost-cap or budget alert configured (recommended: $30/day to start, matching the seller's anonymous-trial budget guardrail).

### Stripe account

- **URL:** https://dashboard.stripe.com
- **Currently held by:** `balaji@kimp.xyz`; KYC under the seller's name + business entity (TBD pre-incorporation).
- **Transfer mechanism:** Stripe accounts **cannot** be transferred between individuals without re-running KYC under the new owner. The transfer paths:
  1. **Account ownership transfer** — Stripe has an official Account Transfer process for business sales. The buyer fills out the Stripe Account Transfer Form (linked from their support docs); both parties sign; Stripe re-runs KYC on the buyer. If the buyer's business entity matches the seller's existing Stripe entity (e.g., asset purchase via a holding company that absorbs the entity), the same Stripe account continues; only the owner's name and tax info change. ETA: 4-7 days post-form-submission.
  2. **New Stripe account** — buyer creates their own Stripe account, re-creates the three credit-pack products + prices, swaps the env vars in Vercel. Cleaner but has a **gap window** — see Risks below.
- **ETA:** 4-7 days for the official transfer; 1-2 days for the new-account path (plus the gap window).
- **Risks:**
  - **The Stripe gap.** In the new-account path, the seller's webhook endpoint stops receiving events the moment the env vars switch to the buyer's keys. Any `checkout.session.completed` events in flight at that moment get dropped (Stripe retries for ~3 days then gives up). Reconciliation: query the seller's Stripe Dashboard → Events for any `checkout.session.completed` events in the 24h pre-cutover that don't have a corresponding `webhook_events` row in Supabase, and manually grant credits via `/admin/refunds` with reason `cutover reconciliation — stripe_pi_<id>`.
  - **KYC delays.** If the buyer is a new business entity, Stripe's KYC can take 5-10 business days (occasionally longer for international entities). Plan for this in the cutover timeline.
  - **Live-mode vs test-mode.** If the seller never finished live-mode approval (current state — pre-launch), the buyer can start fresh in their own account without the gap. This is the smoothest path and what the cutover plan assumes.
  - **Disputes window.** Any chargebacks initiated against transactions on the seller's account remain the seller's responsibility (typically 120 days from transaction). Track open disputes via the daily ops SOP through the 30-day advisory window.
- **Buyer pre-requisites:**
  - Business entity formed and registered in their jurisdiction.
  - EIN / VAT number / tax ID ready for KYC.
  - Bank account in the buyer's name for Stripe payouts.
  - Decision on transfer path (account transfer vs new account) made before signing day.

### Resend account

- **URL:** https://resend.com
- **Currently held by:** `balaji@kimp.xyz`.
- **Transfer mechanism:**
  1. Buyer creates a Resend account.
  2. Seller adds buyer as Admin on the seller's workspace, then transfers ownership via Workspace Settings.
  3. Buyer regenerates the API key (`RESEND_API_KEY`) under their ownership.
  4. Domain verification (SPF + DKIM + DMARC) **must be re-validated** after the domain transfers to the buyer's DNS — Resend re-checks the records on the next send and may temporarily mark the domain unverified.
- **ETA:** 1-2 days for the account transfer; up to 48 hours after domain DNS settles to re-verify DKIM.
- **Risks:**
  - **DKIM downtime.** If domain DNS transfers same-day as the Resend account, DKIM may fail briefly. Email deliverability drops to "junk folder" tier until re-verified. Mitigation: do the Resend transfer **before** the domain DNS transfer; the buyer's DNS provider should mirror the seller's records on day 1 so verification continues.
  - **Sender reputation.** Resend sender reputation is per-domain, not per-account. Reputation accrued under the seller's account stays with the domain when transferred. No reset needed unless the domain itself changes.
  - **Audience lists.** If the seller has any saved Resend audiences (e.g., for incident-response broadcasts — see [`docs/sops/incident_response.md`](../sops/incident_response.md) step 2), they need to be re-shared or recreated under the buyer's account.
- **Buyer pre-requisites:**
  - Resend account.
  - Confirmed control of the domain (or DNS access to add Resend's verification records).

### VAPID keys (Web Push)

- **Currently held by:** Seller's `.env.local` + Vercel production env. Not associated with any account — VAPID keys are a self-issued cryptographic identity for push subscriptions.
- **Transfer mechanism:** Hand the existing keypair to the buyer. Buyer pastes into their Vercel production env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- **ETA:** Same day. Instant.
- **Risks:**
  - **Do not rotate.** Every browser push subscription is bound to the public key it was issued under. Rotating the VAPID keys invalidates every existing subscription, silently — the service worker thinks it's still subscribed, but the push endpoints (FCM, Mozilla autopush) reject pushes signed by the new key. The fix would be to re-prompt every user to grant push permission, which is impossible without site access.
  - **Update `VAPID_SUBJECT`.** This is the `mailto:` URL push providers contact when there's an issue. After transfer, update from `mailto:balaji@kimp.xyz` (or current value) to `mailto:owner@<buyer-domain>`.
- **Buyer pre-requisites:**
  - A monitored inbox at `owner@<buyer-domain>` (or equivalent) for the VAPID subject.

### Cloudflare Turnstile

- **URL:** https://dash.cloudflare.com/?to=/:account/turnstile
- **Currently held by:** `balaji@kimp.xyz` Cloudflare account.
- **Transfer mechanism:** Turnstile widget keys are not transferable between Cloudflare accounts. Buyer creates new widgets:
  1. Buyer creates a Cloudflare account (or uses existing).
  2. Cloudflare Dashboard → Turnstile → Add site → one widget for the production domain.
  3. Optionally a second widget for `localhost` if dev/staging are used.
  4. Buyer fills `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` in their Vercel production env.
- **ETA:** Same day.
- **Risks:**
  - **Brief no-protection window** — if the seller's keys are removed before the buyer's are added, the signup + anonymous-trial endpoints fall through to the no-op verifier (per `lib/turnstile/verify.ts` behavior when secret is unset). Mitigation: sequence the env-swap as "add buyer's keys → confirm widget renders → remove seller's keys".
- **Buyer pre-requisites:**
  - Cloudflare account.

### Cloudflare DNS (and/or domain registrar)

- **Currently held by:** Pending — domain not yet registered as of 2026-05-29. Assume the seller registers `<domain>` shortly before sale.
- **Transfer mechanism:**
  - **If domain registrar is Cloudflare** (preferred): Cloudflare's domain transfer is between accounts — seller goes to Cloudflare Registrar → Transfer Domain Out → generates a transfer code, gives it to buyer; buyer initiates inbound transfer in their account. Time: ~5 days due to ICANN's mandatory transfer pending period.
  - **If domain registrar is elsewhere** (Namecheap, Google Domains, etc.): standard EPP transfer between registrars. Seller unlocks domain → generates auth code → buyer pays at receiving registrar → waits 5-7 days for ICANN approval window.
- **ETA:** 5-7 days. The 5-day ICANN waiting period is fixed; can't be shortened.
- **Risks:**
  - **ICANN 60-day lock.** Newly-registered or recently-transferred domains are locked for 60 days under ICANN policy. If the domain was registered within the last 60 days, an inter-registrar transfer is blocked. Workaround: the buyer takes over the account at the existing registrar instead of transferring the domain. ETA same-day if the registrar supports account transfer.
  - **DNS propagation.** Even after registrar transfer, DNS TTLs determine when traffic flips. Set TTLs to 300 (5 min) at least 24 hours before the cutover, so propagation is minutes not days.
  - **WHOIS privacy.** Buyer needs to re-enable WHOIS privacy on their side after transfer — it's per-registrar.
  - **Email forwarding** — if `support@<domain>` and `legal@<domain>` were forwarding aliases at the registrar, buyer must re-configure on their side.
- **Buyer pre-requisites:**
  - Account at receiving registrar (or willingness to use Cloudflare Registrar).
  - Payment method on file (most registrars charge for inbound transfers, often a 1-year renewal fee).
  - Email forwarding plan for `support@`, `legal@`, `privacy@`, `owner@`.

### PostHog

- **URL:** https://posthog.com (US Cloud) or https://eu.posthog.com
- **Currently held by:** `balaji@kimp.xyz` PostHog organization.
- **Transfer mechanism:**
  1. Seller invites buyer to the organization as Owner.
  2. Buyer accepts.
  3. Seller leaves the organization. Buyer remains the sole Owner.
  4. Buyer regenerates the project API key (`NEXT_PUBLIC_POSTHOG_KEY`) if desired (optional — the key is public-bundle so rotation has marginal security value, but it disambiguates pre- and post-acquisition events for analytics hygiene).
- **ETA:** 1-2 days.
- **Risks:**
  - **Historical event data** stays with the project, not the owner — preserved across the ownership change.
  - **Funnel + dashboard definitions** are project-scoped, so they persist. Buyer should review any funnel that references seller-specific cohorts.
  - **Plan tier** — PostHog free tier has event ceilings. Buyer's existing PostHog plan may not match seller's; verify before transfer.
- **Buyer pre-requisites:**
  - PostHog account on a plan that supports the production event volume (currently low — free tier is fine for MVP).

### Sentry

- **URL:** https://sentry.io
- **Currently held by:** `balaji@kimp.xyz` Sentry organization.
- **Transfer mechanism:**
  1. Seller invites buyer as Owner.
  2. Seller leaves the org once buyer accepts.
  3. Buyer rotates the DSN if desired (low-value rotation; DSN is public).
  4. Buyer rotates `SENTRY_AUTH_TOKEN` — this one matters, it's used for source-map upload and has `project:write` scope. Buyer issues a new token in their User Settings → Auth Tokens.
- **ETA:** Same day.
- **Risks:**
  - **Historical issues** preserved on the org. Buyer inherits the open issue queue.
  - **Release association** — source maps uploaded under the seller's auth token are tagged with the seller's release info. After transfer, releases continue with the new token and the join is seamless as long as `SENTRY_ORG` + `SENTRY_PROJECT` slugs don't change.
- **Buyer pre-requisites:**
  - Sentry account.

### Upstash Redis

- **URL:** https://console.upstash.com
- **Currently held by:** `balaji@kimp.xyz` Upstash account.
- **Transfer mechanism:**
  1. Seller invites buyer to the team as Owner.
  2. Seller leaves.
  3. Buyer regenerates `UPSTASH_REDIS_REST_TOKEN` (the token is account-scoped; rotating it severs any access seller might have retained).
- **ETA:** Same day.
- **Risks:**
  - **Cached rate-limit counters** persist across the transfer. No data migration needed.
  - **Region pinning** — if seller's database was provisioned in a region far from buyer's Vercel deploy, performance degrades. Buyer may want to create a new database in the closer region and swap env vars; the existing rate-limit keys have short TTLs (24h max) so the cutover loses at most a day of counters.
- **Buyer pre-requisites:**
  - Upstash account.

---

## Social handles

Social handles are the highest-risk transfer category. Once a handle is vacated for more than ~48 hours, squatters and impersonators are likely to take it. Sequence these last in the cutover, but execute them quickly.

### X (Twitter) — `@trendlyapp` (or equivalent registered handle)

- **Currently held by:** Seller's personal X account (pending — handle not yet registered as of 2026-05-29; assume registered shortly before sale).
- **Transfer mechanism:**
  1. Seller changes the email on the account from `balaji@kimp.xyz` to a buyer-controlled email (`owner@<buyer-domain>`).
  2. Buyer initiates a password reset to the new email and takes ownership.
  3. Seller removes any remaining authentication factors (phone number, recovery codes).
- **ETA:** 1-3 days. The email change is instant; buyer needs to verify the new email + remove the seller's recovery options. X may require a 24-hour cooldown between email change and password reset.
- **Risks:**
  - **2FA lockout.** If 2FA is enabled with the seller's phone, the buyer cannot access the account until 2FA is disabled. Disable 2FA before the email change, then re-enable with the buyer's phone after.
  - **Verified badge (if applicable)** — X's verification policy ties the badge to the original applicant. The buyer may need to re-apply post-transfer.
  - **Suspended-by-X risk** — abnormal account changes (rapid email + password reset) sometimes trigger X's security review, locking the account for 24-72 hours.
- **Buyer pre-requisites:**
  - Email + phone ready for the new credentials.
  - X account exists (the receiving end of the transfer is just changing email/auth on the existing account, not creating a new one).

### Instagram — `@trendlyapp`

- **Currently held by:** Seller's IG account (pending registration; assume registered shortly before sale; should be a Business account for analytics).
- **Transfer mechanism:**
  1. Seller changes the account email (Settings → Account → Email) to a buyer-controlled address.
  2. Seller removes the linked Facebook account and re-links (if applicable) to a Facebook page the buyer controls.
  3. Seller removes 2FA, then the buyer resets the password via the new email.
- **ETA:** 1-3 days. Slower than X because Instagram occasionally enforces a 14-day cooldown between email changes for account-security reasons. Plan for the slow path.
- **Risks:**
  - **Meta Business Suite linkage.** If the IG is a Business account linked to a Meta Business Suite, the suite ownership is separate. Buyer must take over the Business Suite via Meta's official ownership transfer flow (which can take 7 days and requires document verification).
  - **Squatter risk during transfer.** If the seller deletes the account thinking they'll "make it cleaner," the handle becomes available for any other user. Do not delete. Always transfer in place.
- **Buyer pre-requisites:**
  - Email + phone for the new credentials.
  - Facebook page (if the IG is linked) ready under the buyer's control.

### TikTok — `@trendlyapp`

- **Currently held by:** Seller's TikTok account.
- **Transfer mechanism:**
  1. Seller changes the linked email to a buyer-controlled address.
  2. Seller removes 2FA.
  3. Buyer resets password via new email.
- **ETA:** 1-3 days. TikTok occasionally requires phone re-verification on email change.
- **Risks:**
  - **Phone re-verification** — TikTok may force a phone-verify on the new login attempt. If the buyer's region differs from the seller's, this can fail (TikTok geo-locks phone numbers occasionally). Workaround: do the email + phone change on the seller's existing device before handing access over.
  - **Creator Marketplace + Business account features** — these are tied to TikTok's internal account ID, which doesn't change with email. Buyer inherits them.
- **Buyer pre-requisites:**
  - Email + phone for the new credentials.

### Threads — `@trendlyapp`

- **Currently held by:** Linked to the Instagram account (Threads is a Meta product, tied 1:1 to an IG handle).
- **Transfer mechanism:** Tied to Instagram. When IG transfers, Threads transfers with it. No separate action.
- **ETA:** Same as Instagram.
- **Risks:** Same as Instagram.
- **Buyer pre-requisites:** Same as Instagram.

### Bluesky (optional, if registered)

- **Currently held by:** Seller's account (assume registered if cross-posting per the new_trend_weekly SOP).
- **Transfer mechanism:** Bluesky supports account portability via the AT Protocol — but the simplest path is the email-change + password-reset pattern used for X.
- **ETA:** Same day.

---

## Pre-cutover seller checklist

Before any account is transferred, the seller (you) should:

- [ ] Inventory all credentials currently in `.env.local` and Vercel production env against [`docs/CREDENTIALS.md`](../CREDENTIALS.md). Confirm no orphan vars exist.
- [ ] Export historical billing data from Stripe + Gemini for the buyer's records.
- [ ] Take screenshots of all sub-processor settings (DKIM records, webhook endpoints, rate-limit settings) for buyer reference.
- [ ] Confirm 2FA is enabled on every account being transferred — and that the buyer has a plan for taking over the second factor (phone, authenticator, recovery codes).
- [ ] Confirm no accounts use `balaji@kimp.xyz` as the sole recovery email after the transfer is complete.
- [ ] Document any "balaji@kimp.xyz received this OAuth grant from Trendly users" type relationships — none should exist (users sign in directly to Supabase, not to seller's email), but verify.

---

## Cross-references

- [`docs/CREDENTIALS.md`](../CREDENTIALS.md) — the env var origin for each account.
- [`docs/transferability/post-acquisition-timeline.md`](./post-acquisition-timeline.md) — the day-by-day cutover sequence using these account-level mechanisms.
- [`docs/LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md) — placeholders that must be filled before any production deploy (regardless of who is operating).
- [`docs/RUNBOOK.md`](../RUNBOOK.md) §3 — the 14-test verification matrix the buyer runs on Day 14 to confirm cutover is complete.
