# Post-Acquisition Cutover Timeline

**Last updated:** 2026-05-29
**Window:** 14 days from signing, plus a 30-day advisory tail.
**Authority:** Operationalizes the transferability section of the sellable-asset plan, in conjunction with [`docs/transferability/per-account-transfer-plan.md`](./per-account-transfer-plan.md).

This is the calendar-time sequencing of the per-account transfer mechanisms. The per-account plan describes **how** to transfer each account; this document describes **when** and **in what order**, and what is at risk during the cutover.

Two principles shape the timeline:

1. **Fast accounts first.** GitHub, Sentry, Cloudflare Turnstile, VAPID hand-off — all sub-1-day operations. Doing them on Day 1 reduces the seller's blast radius and gives the buyer time to verify each step.
2. **The Stripe gap is the long pole.** Plan everything else around the Stripe transfer's 4-7 day KYC window. Domain transfer (5-7 days) runs in parallel so the two slowest items overlap rather than serialize.

---

## Day 0 — Pre-signing

Everything done before the asset purchase agreement is signed.

### Seller actions

- [ ] Confirm [`docs/CREDENTIALS.md`](../CREDENTIALS.md) is current — every env var in `.env.local` and Vercel production env is documented.
- [ ] Confirm [`docs/transferability/per-account-transfer-plan.md`](./per-account-transfer-plan.md) is up to date.
- [ ] Generate a one-time inventory of all sub-processor logins, billing addresses, current MRR / cost-of-goods, and any pending support tickets.
- [ ] Take a final database snapshot via Supabase Dashboard → Database → Backups. Keep the snapshot for 90 days post-sale as a safety net.
- [ ] Confirm Vercel deploys are green (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`).
- [ ] Confirm the 14-test verification matrix in [`docs/RUNBOOK.md`](../RUNBOOK.md) §3 currently passes against production.
- [ ] Make sure `MOCK_TRENDS` is unset in Vercel production env (the LAUNCH_CHECKLIST flagged this as critical).

### Buyer actions

- [ ] Provision the receiving accounts:
  - GitHub organization.
  - Vercel team (on a paid plan if production usage exceeds Hobby).
  - Supabase organization (Pro plan to match seller's tier).
  - Google Cloud project with Gemini API enabled.
  - Cloudflare account (for Turnstile + DNS, if domain registrar will be Cloudflare).
  - Resend, PostHog, Sentry, Upstash accounts.
- [ ] Decide Stripe path: account transfer (slow, preserves history) vs new account (faster, has gap window). Stripe path should be agreed before signing day because it dictates the rest of the timeline.
- [ ] Form the business entity that will own the asset (if not already done).
- [ ] Have EIN / VAT / tax ID + business bank account ready for Stripe KYC.
- [ ] Identify the email aliases that will receive forwarded traffic: `owner@`, `support@`, `legal@`, `privacy@`.

### Joint actions

- [ ] Sign the asset purchase agreement.
- [ ] Confirm signing day = Day 1. Earliest possible Day 1 should be on a Monday so the 14-day window doesn't span two weekends.

---

## Day 1 — Signing day

The first 24 hours focus on the fastest, lowest-risk transfers. By end of day, the buyer has read access to the codebase and the error/analytics tooling.

### Morning (Day 1 hours 0-6)

- [ ] **GitHub repo transfer.** Seller initiates transfer → buyer accepts. (~5 minutes including the GitHub UI flow.)
- [ ] **GitHub Actions secrets.** Buyer re-adds every secret from `.github/workflows/ci.yml`. Run a manual workflow trigger to confirm CI is green under the buyer's secrets.
- [ ] **Sentry transfer.** Seller invites buyer as Owner. Buyer accepts. Buyer creates a new `SENTRY_AUTH_TOKEN` under their account. Test by triggering a known error and confirming it lands in Sentry under the buyer's owner identity. (~30 min total.)
- [ ] **PostHog transfer.** Seller invites buyer as Owner. Buyer accepts. No env-var rotation strictly required (the publishable key is the same). (~15 min.)
- [ ] **Upstash transfer.** Seller invites buyer to the team. Buyer accepts. Buyer rotates `UPSTASH_REDIS_REST_TOKEN` and updates Vercel env. Confirm rate limiting still triggers (run 21 generations to confirm 429 on the 21st). (~30 min.)

### Afternoon (Day 1 hours 6-12)

- [ ] **Cloudflare Turnstile transfer.** Buyer creates Turnstile widgets in their Cloudflare account. Buyer adds new `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` to Vercel env. Confirm login form renders the widget. (~30 min.)
- [ ] **VAPID hand-off.** Seller shares the existing keypair (encrypted channel — 1Password, signed message, etc.). Buyer pastes into Vercel env. Update `VAPID_SUBJECT` to `mailto:owner@<buyer-domain>` once the domain transfer settles (placeholder is fine until then). (~15 min.)
- [ ] **Initial Vercel access.** Seller adds buyer as Owner on the Vercel team. Buyer can now see deploys, logs, and env vars. (~10 min.)

### Day 1 end-of-day check

- [ ] Buyer can clone the repo and push a no-op commit; CI runs green.
- [ ] Buyer sees production errors in their Sentry org.
- [ ] Buyer sees production events in their PostHog project.
- [ ] Rate limiting still works (verified by 21-request test).
- [ ] Turnstile widget still appears on `/login`.

The seller is still operationally responsible for incidents today — buyer has read access to most tools but the production deploy is still under seller's keys.

---

## Day 2-3 — Infrastructure transfer

The bulk of the back-end transfer happens here. By end of Day 3, the buyer's keys are the production keys for Vercel, Supabase, Resend, and Gemini.

### Day 2 — Supabase + Gemini

- [ ] **Supabase project transfer.** Seller invites buyer as Owner on the org. Buyer accepts. (If the buyer needs the project in their own org, file the Supabase support ticket on Day 1 so the org transfer can complete in the Day 2-3 window.) (~30 min, plus support response time if applicable.)
- [ ] **Supabase service-role key rotation.** Buyer regenerates via Dashboard → Project Settings → API → Reset. Buyer updates `SUPABASE_SERVICE_ROLE_KEY` in:
  - Vercel production env.
  - GitHub Actions secrets.
  - Supabase Edge Function secrets (`pnpm supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... --project-ref <ref>`).
- [ ] **Gemini API key swap.** Buyer creates a Gemini API key in their GCP project. Buyer updates `GEMINI_API_KEY` in Vercel env and Supabase Edge Function secrets. Seller's old key remains active as a fallback for 30 days.
- [ ] **End-of-day Day 2 test.** Buyer signs in as a test user (their own account), generates one image, confirms it completes under their keys. Tail Edge Function logs to confirm the Gemini call routes through the buyer's project. Run RUNBOOK Tests 3, 4, 5 (idempotency, retry, refund-on-safety) to validate the core generation path.

### Day 3 — Vercel + Resend + PostHog (project-level)

- [ ] **Vercel project transfer.** Seller initiates Project Transfer to buyer's team (or, if Day 1's "invite as Owner" approach was used, seller now leaves the team). Buyer accepts. Buyer confirms domain associations preserved.
- [ ] **Vercel environment variables.** Buyer reviews every production env var against [`docs/CREDENTIALS.md`](../CREDENTIALS.md). Replace any that were under seller's keys (Gemini key already swapped Day 2; same for Supabase service-role key, Sentry auth token, Upstash token, Turnstile keys).
- [ ] **Resend transfer.** Seller invites buyer as Admin → transfers workspace ownership → seller leaves. Buyer regenerates `RESEND_API_KEY` and updates Vercel env.
- [ ] **DKIM re-verification status.** Buyer confirms domain still shows Verified in Resend (no action needed unless DKIM records were affected — domain DNS transfers on Day 4-10, so this is a planned re-check then).
- [ ] **PostHog ownership.** Seller leaves the org. Buyer is sole Owner.
- [ ] **Smoke test.** Run RUNBOOK Tests 7 (eval gate), 8 (push + email fallback), 9 (SSR completeness), 10 (pg_cron purges) to validate the broader stack works under buyer's keys.

### Day 3 end-of-day check

- [ ] Buyer-owned Vercel deploys to production successfully.
- [ ] Generations flow end-to-end through buyer's Gemini key.
- [ ] Push notifications still fire (VAPID keys handed over Day 1, push subscriptions never invalidated).
- [ ] Email fallback delivers from buyer's Resend account.
- [ ] Rate limits, Turnstile, Sentry, PostHog all routed to buyer's services.
- [ ] Sentry shows zero new critical errors from the transfer activity.

At this point, **everything except Stripe and the domain runs on the buyer's keys.** The seller is no longer load-bearing for day-to-day operations — only for Stripe (still in transfer) and DNS (still in transfer).

---

## Day 4-10 — Slowest items (Stripe + domain)

These two transfers run in parallel because both involve external waiting periods.

### Day 4 — Initiate Stripe transfer

- [ ] **Path A: Account transfer (preferred if seller has live Stripe).** Both parties complete the Stripe Account Transfer Form. Submit to Stripe Support. Expect 4-7 business days for KYC re-run.
- [ ] **Path B: New Stripe account (if seller is pre-live, current state).** Buyer creates a Stripe account in their business entity. Buyer creates the three credit-pack products + prices (per [`docs/RUNBOOK.md`](../RUNBOOK.md) §2.3 recipe). Buyer notes the new `price_…` IDs.
- [ ] **Path B continued.** Buyer creates a webhook endpoint pointing to the same `https://<domain>/api/stripe/webhook` URL. Copies the new signing secret.
- [ ] **Hold the env-var swap.** Even in Path B, do **not** swap `STRIPE_*` env vars in Vercel yet. Holding the swap until a planned window minimizes the gap; see Day 8.

### Day 4 — Initiate domain transfer

- [ ] **Lower DNS TTL.** Seller changes DNS records' TTL to 300 seconds (5 min) on all production records. This shortens the propagation window during the actual flip.
- [ ] **Unlock domain at current registrar.** Seller initiates "Transfer Out" → receives auth/EPP code.
- [ ] **Initiate inbound transfer.** Buyer enters auth code at their registrar (or, if both use Cloudflare Registrar, buyer initiates the inter-account transfer).
- [ ] **ICANN 5-day pending period begins.** Don't do anything; wait it out. Cannot be shortened.

### Day 5-7 — Monitoring

Both transfers are in pending state. Things to verify daily:

- [ ] Stripe Support has not requested additional KYC documents (if Path A). Respond same-day if asked.
- [ ] Domain transfer status remains "pending" not "rejected" at either registrar. If the receiving registrar rejects (rare — usually for unpaid balance or contact info mismatch), resolve and resubmit.
- [ ] No incidents on production. Seller is still on-call.

### Day 8 — Stripe cutover

Once Path B Stripe account is live and verified, schedule the env-var swap. Best window: late evening US Eastern (low traffic).

- [ ] Confirm zero pending `webhook_events.processed_at IS NULL` rows. (If any are pending, manually re-trigger before the cutover so the seller's webhook drains.)
- [ ] Buyer swaps in Vercel env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID_SMALL/MEDIUM/LARGE`.
- [ ] Buyer triggers a deploy to apply the new env vars.
- [ ] Buyer runs RUNBOOK Test 12 (Stripe webhook idempotency) using a test-mode card + Stripe CLI replay.
- [ ] Buyer monitors the next 24h of `webhook_events` table — first real customer purchase confirms end-to-end.
- [ ] **Reconciliation pass.** Query Stripe Dashboard → Events on the seller's account for `checkout.session.completed` events in the prior 48h. For each, confirm a matching `webhook_events` row in Supabase (the seller's webhook handled them). Any missing rows: manually grant credits via `/admin/refunds` with reason `cutover reconciliation — stripe_pi_<id>`. See [`docs/transferability/per-account-transfer-plan.md`](./per-account-transfer-plan.md) Stripe section, "The Stripe gap" risk.

### Day 9-10 — Domain transfer completion + DNS cutover

- [ ] **ICANN approval lands.** Buyer's registrar shows domain as "Active" in their account.
- [ ] **Move DNS to buyer's provider.** Buyer points the domain's nameservers at their Cloudflare account (or whatever DNS provider they use). Add the same A / AAAA / CNAME records the seller had — Vercel project's domain config gives the exact records needed.
- [ ] **Re-verify domain associations.**
  - Vercel project → Domains → confirm the production domain is still verified (TTL minimum was 300s, so propagation finishes within minutes).
  - Resend → Domains → re-verify SPF + DKIM + DMARC records. The buyer must copy seller's records exactly. If records were managed by Resend (via Cloudflare API integration), re-integrate.
  - Supabase Auth → Site URL → confirm matches.
- [ ] **Update `NEXT_PUBLIC_SITE_URL`.** Should already be the production domain; if any change in subdomain or scheme occurred during transfer, update Vercel env now.
- [ ] **Update VAPID subject.** `VAPID_SUBJECT=mailto:owner@<buyer-domain>` now that the buyer's email exists.
- [ ] **Re-run RUNBOOK Test 8** (push + email fallback) and **Test 9** (SSR + sitemap) to confirm the domain swap didn't break either.

### Day 10 end-of-day check

- [ ] Stripe under buyer's keys. Test purchase succeeds. Webhook event drained, no `processed_at IS NULL` rows.
- [ ] Domain under buyer's control. DNS pointing to buyer's nameservers. All sub-domain integrations re-verified.
- [ ] Email forwarding works: send a test email to `support@<domain>`, confirm it lands in the buyer's inbox.
- [ ] Resend, Vercel, Supabase, Sentry, PostHog all show no errors related to the domain swap.

---

## Day 11-14 — Social handles + cleanup

The infrastructure is the buyer's. Now the brand surfaces transfer.

### Day 11 — X / Twitter handle

- [ ] Seller disables 2FA on the X account (temporary).
- [ ] Seller changes the email to `owner@<buyer-domain>`.
- [ ] Seller waits the cooldown (typically 24h, sometimes longer).
- [ ] Buyer initiates password reset to the new email, takes ownership.
- [ ] Buyer re-enables 2FA with their phone.

### Day 12 — Instagram + Threads + TikTok

- [ ] Instagram: same email-swap pattern. If Business account linked to Meta Business Suite, file the official Meta ownership transfer (this takes 7 days and the timeline accounts for it — handle the easier part now and follow up on Day 19-20 for the Business Suite transfer outside the 14-day window if needed).
- [ ] Threads: transfers automatically with Instagram.
- [ ] TikTok: email-swap. Phone re-verification on first login from buyer's device.

### Day 13 — Final 2FA rebinds + cleanup

- [ ] For every account transferred, verify 2FA is under buyer's phone/authenticator and recovery codes are stored in buyer's password manager.
- [ ] Remove seller from any remaining "Owner" or "Admin" roles. Run through the per-account list one more time.
- [ ] Confirm `balaji@kimp.xyz` is not a recovery email on any account.
- [ ] Update [`docs/CREDENTIALS.md`](../CREDENTIALS.md) with the buyer's contact info as the "where to get" reference (or remove the personal references entirely).
- [ ] Update [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) contact emails to `support@<buyer-domain>` and `privacy@<buyer-domain>`.
- [ ] Update [`docs/TERMS_OF_SERVICE.md`](../TERMS_OF_SERVICE.md) operator contact.
- [ ] Commit the doc updates with author = buyer (the asset is now theirs).

### Day 14 — Buyer's sign-off checklist

By end of Day 14, the buyer can independently complete every action below. Each line must check `[x]` before the cutover is declared complete.

- [ ] **I can deploy from main.** `git push origin main` → Vercel CI runs → production deploy succeeds.
- [ ] **I can run the runbook.** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` are all green on my machine.
- [ ] **I can refund a customer.** I have admin access at `/admin/refunds`. I can issue a test credit grant against a test profile and see it in `/admin/audit`.
- [ ] **I have every key.** Every env var in [`docs/CREDENTIALS.md`](../CREDENTIALS.md) is set in my Vercel production env, sourced from accounts under my ownership.
- [ ] **I can read the dashboards.** `/admin`, `/admin/trends`, `/admin/suggestions`, `/admin/audit`, `/admin/engagement` all render.
- [ ] **I have working observability.** Sentry shows my org's projects; PostHog shows my project's live events; Vercel logs are tailing.
- [ ] **I have the runbook + SOPs.** I can find [`docs/RUNBOOK.md`](../RUNBOOK.md), [`docs/sops/daily_ops.md`](../sops/daily_ops.md), [`docs/sops/incident_response.md`](../sops/incident_response.md), [`docs/sops/refund_request.md`](../sops/refund_request.md), [`docs/sops/takedown.md`](../sops/takedown.md), [`docs/sops/new_trend_weekly.md`](../sops/new_trend_weekly.md), and I've read each one.
- [ ] **I can run the 14-test verification matrix.** I executed RUNBOOK §3 against the production deploy under my keys. All 14 tests pass.
- [ ] **I own the social handles.** I can post from X, Instagram, TikTok, Threads.

If any line is still `[ ]`, the cutover is not complete — re-engage the seller to fix before signing the 14-day sign-off.

---

## Day 30 — Founder availability ends

The 30-day post-acquisition advisory window is part of the deal: 30 days from signing, the seller is reachable on Slack / email / scheduled calls for incidents and questions that require historical context. After Day 30:

- The buyer is fully autonomous.
- The seller is no longer obligated to respond.
- Any continued advisory relationship would require a separate consulting agreement.

What the seller still owes after Day 30:

- Cooperation on any pre-Day-30 incidents that surface later (e.g., a tax authority asks about a 2026 transaction).
- Honoring any non-compete / non-solicit clauses in the asset purchase agreement.
- Returning any incidentally-retained credentials (Stripe disputes that arrive in the post-cutover window).

What the seller no longer owes:

- Day-to-day operational guidance.
- Code-level walkthroughs (the codebase is the buyer's).
- Strategic advice on the product roadmap.

---

## Risks to monitor across the window

| Risk | Mitigation | Detection signal |
|---|---|---|
| **Stripe webhook events during the gap.** Path B's swap window may drop `checkout.session.completed` events. | Reconcile via Stripe Dashboard → Events → compare against `webhook_events` table for the 48h pre-cutover. Manually grant credits for any missing event. | Customer reports "I paid but didn't get credits" + `webhook_events` row missing for the corresponding Stripe event ID. |
| **Email deliverability after Resend transfer.** DKIM re-verification can briefly mark domain as unverified. | Buyer copies seller's DNS records exactly; verify on Resend dashboard before sending any production email. Test send to a personal Gmail to confirm inbox placement. | First production email arrives in spam or bounces with `dkim=fail` in headers. |
| **Social handle squatters.** Vacated handle picked up by impersonator within 48h of being unbound. | Transfer in place (don't delete + recreate). If a handle must be temporarily disabled, set the account to private during the window. | Search the handle on the platform — if a different account appears, escalate to the platform's trademark / impersonation report process. |
| **DNS propagation surprises.** TTLs not fully respected by all resolvers; some users see old IP for hours. | TTL set to 300s 24h before cutover. Monitor real-user-monitoring (Vercel Web Analytics) for traffic to the old IP — should drop to zero within 30 min of cutover. | Vercel Web Analytics still shows requests to the old origin > 1h post-cutover. |
| **Gemini quota carryover.** Buyer's new GCP project starts with default quotas. Production traffic may exceed them. | Request quota increase from Google Cloud Console on Day 1, before any swap. Have the increase approved before Day 2 Gemini key swap. | Production generations start failing with `429 quota exceeded` in the hours after the swap. |
| **MFA lockout.** Buyer cannot access an account because 2FA still routes to seller's phone. | For every account transferred, disable 2FA temporarily before email swap; re-enable with buyer's factors after. Document in the per-account log. | Buyer cannot complete password reset because the 2FA code goes to seller's phone. |
| **Forgotten env var.** A single var missed during the swap — site silently degrades. | [`docs/CREDENTIALS.md`](../CREDENTIALS.md) checklist; the 14-test matrix on Day 14 exercises every subsystem. | Sentry error rate jumps post-swap; a feature works in dev but not in prod. |
| **Customer chargebacks.** Pre-cutover transactions can generate chargebacks for up to 120 days. | Track open Stripe disputes via the daily ops SOP. Seller agrees to cooperate on disputes for transactions originating on seller's account during the 30-day advisory window. | Stripe dispute notification email arrives post-cutover for a transaction the buyer doesn't recognize. |

---

## Cross-references

- [`docs/transferability/per-account-transfer-plan.md`](./per-account-transfer-plan.md) — the per-account "how" that this document sequences.
- [`docs/CREDENTIALS.md`](../CREDENTIALS.md) — the env-var checklist.
- [`docs/RUNBOOK.md`](../RUNBOOK.md) §3 — the 14-test matrix run on Day 14.
- [`docs/sops/incident_response.md`](../sops/incident_response.md) — the playbook the buyer follows for any incident in the cutover window or after.
- [`docs/LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md) — the placeholder swap pass the buyer can verify is complete post-cutover.
