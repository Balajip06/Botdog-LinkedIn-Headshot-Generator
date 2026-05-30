# Trendly — Data Room

**Last refreshed:** 2026-05-29 (placeholder — refresh date is updated each time files inside are touched)
**Owner:** `balaji@kimp.xyz` (seller, pre-acquisition)
**Encryption:** customer PII files inside this folder are anonymized (SHA-256 8-char prefix on user_id / email). The de-anonymization key (mapping the prefix back to the raw user id) is held separately by the seller and handed to the buyer **after NDA + LOI** — never inside this folder.
**Access control:** Google Drive shared folder, explicit-share-only (no public link). Per-recipient share grants are tracked in `seller-notes/access-log.md` (not part of this index).

This is the master index for everything a buyer's diligence team needs to evaluate Trendly. The folder structure mirrors the standard SaaS data-room layout — financial, customer, product, infrastructure, ownership, legal, runbooks, transferability. Each subfolder has its own `README.md` (one per section) plus the artifacts listed below.

Some files are placeholders today. They accrue between now and the W14 listing date — buyer can request the latest snapshot at any point in the diligence cycle.

---

## Folder map

```
/data-room/
  /01-financial/
  /02-customers/
  /03-product/
  /04-infrastructure/
  /05-ownership/
  /06-legal/
  /07-runbooks/
  /08-transferability/
```

---

## 01-financial — Revenue, costs, unit economics

**Purpose:** the buyer's finance lead reads this first. They are checking: actual revenue (not projections); cost of goods (Gemini + Vercel + Supabase); gross margin per credit pack sold; runway / cash on hand; refund + chargeback rates; the seller's own historical view of CAC and LTV.

**Files in this folder (at listing time):**

| File                   | Description                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `revenue-by-month.csv` | Monthly Stripe gross revenue, refunds, net revenue. Pulled from Stripe Dashboard → Reports → Payouts.                                                                          |
| `revenue-by-pack.csv`  | Per-pack-id (small / medium / large) volume + AOV. Sourced from `webhook_events` joined to Stripe metadata.                                                                    |
| `cost-of-goods.csv`    | Monthly Gemini spend (per GCP billing), Vercel spend, Supabase spend, Resend spend, etc. One row per vendor per month.                                                         |
| `unit-economics.md`    | Narrative: gross margin per pack, blended COGS per generation, sensitivity to Gemini price changes, the $20/day anonymous-trial guardrail and what happens when it's breached. |
| `marketing-spend.csv`  | Monthly UTM-sourced ad spend, sourced from `admin_marketing_spend` (migration `20260529000011`).                                                                               |
| `cohort-retention.csv` | (Accrual-dependent — see "Files to add post-W14" below.) Weekly retention by signup cohort, sourced from PostHog → Insights → Retention.                                       |
| `financial-model.xlsx` | (Accrual-dependent — added when ≥ 3 months of revenue history exists.) Forward 12-month projection with assumptions cell-marked.                                               |

**Source of truth:**

- Stripe revenue → Stripe Dashboard → Reports → Payouts (exported monthly).
- Gemini cost → Google Cloud Console → Billing → Reports → Cost Table, filtered to the `aistudio` SKU.
- Vercel / Supabase / Resend cost → each vendor's billing export.
- Cohort + funnel → PostHog → Insights → Retention / Funnels.
- Marketing spend → `admin_marketing_spend` table in the production database.

**Refresh cadence:** monthly for `revenue-by-*.csv` + `cost-of-goods.csv`. Pre-listing snapshot taken at W7. Re-snapshotted at every LOI delivery.

---

## 02-customers — User base, retention, support

**Purpose:** the buyer's growth lead checks here. They want: how many real users, how active they are, what the support load looks like, whether the user base is diversified across acquisition channels.

**Files in this folder:**

| File                         | Description                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users-summary.md`           | High-level counts: total signups, 7-day active, 30-day active, all-time generations, paid users, free-tier-only users. As of last refresh date.                  |
| `acquisition-by-channel.csv` | `profiles.acquisition_source` rollup — organic / SEO / paid social / referral / direct. Sourced from migration `20260529000003_profiles_acquisition_source.sql`. |
| `top-trends.csv`             | Per-trend impression + generation counts, ordered. Sourced from `trend_events` + `generations` joined to `trends.slug`.                                          |
| `support-volume.csv`         | Monthly count of support tickets received via the contact form. Currently low / zero pre-launch — refresh post-launch.                                           |
| `testimonials.md`            | (Accrual-dependent.) Verbatim customer testimonials collected post-launch, attributed with consent. Anonymous quotes marked as such.                             |
| `screenshots/`               | (Accrual-dependent.) Screenshots of standout user-generated outputs (with creator consent).                                                                      |

**Source of truth:**

- Anonymized user export → `/admin/export/download?dataset=customers` (admin route emits CSV with hashed `user_id` + counts only).
- Anonymized generations export → `/admin/export/download?dataset=generations` (one row per generation, hashed user_id, trend slug, status, cost).
- Support tickets → currently the founder's inbox (`support@<domain>`); will route through a help-desk SaaS post-scale.
- Testimonials → collected via post-purchase email + DM outreach. Stored in `testimonials.md` with attribution + consent confirmation.

**Refresh cadence:** weekly during diligence; otherwise monthly.

---

## 03-product — Architecture, roadmap, retention proof

**Purpose:** the buyer's engineering / product lead reads this. They want: how the system works (architecture), what's been built (changelog), what's planned (roadmap), and proof that real users stick around (retention).

**Files in this folder:**

| File                      | Description                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `architecture_diagram.md` | Pointer to [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md). One paragraph + link to avoid duplication.                                                                |
| `roadmap.md`              | The 12-month roadmap from the seller's perspective: Phase 5 payments → Phase 6 auto trend detector → multilingual → API for B2B. Buyer can fork after acquisition. |
| `changelog.md`            | Curated changelog of shipped milestones (Phase 0-4 done dates, key commits). Sourced from `git log --oneline --grep="feat:"`.                                      |
| `feature-inventory.md`    | Inventory of every consumer-facing surface (route + what it does) and admin surface. Mirrors the route table in `docs/ARCHITECTURE.md`.                            |
| `retention-cohorts.png`   | (Accrual-dependent.) PostHog retention-curve screenshot, weekly cohorts.                                                                                           |
| `nps-results.md`          | (Accrual-dependent.) NPS survey results if a survey has been run.                                                                                                  |

**Source of truth:**

- Architecture → [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).
- Roadmap → seller's working doc, transferred at close.
- Changelog → `git log` on `main`.
- Retention → PostHog → Insights → Retention.

**Refresh cadence:** changelog + feature-inventory monthly; architecture diagram on any material change.

---

## 04-infrastructure — Stack, sub-processors, security posture

**Purpose:** the buyer's infrastructure / security lead checks here. They want: which vendors hold customer data; security posture (RLS, headers, audit log); the security review status; SOC 2 / ISO posture of each sub-processor.

**Files in this folder:**

| File                        | Description                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture.md`           | Pointer to [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).                                                                                                                                                                                                                                                                                                        |
| `sub-processors.md`         | Pointer to [`docs/legal/SUB_PROCESSORS.md`](../legal/SUB_PROCESSORS.md).                                                                                                                                                                                                                                                                                        |
| `credentials-reference.md`  | Pointer to [`docs/CREDENTIALS.md`](../CREDENTIALS.md).                                                                                                                                                                                                                                                                                                          |
| `security-posture.md`       | One-page summary: HSTS + X-Frame + Referrer-Policy + Permissions-Policy live; CSP deferred; RLS on every user-facing table; Turnstile on signup + anonymous; idempotency on `/api/generate` + `/api/stripe/webhook`; SHA-256 PII hashing pre-log; soft-delete + 30d purge; audit log immutable; service-role bypass only inside server-side trusted code paths. |
| `vendor-security-overview/` | One file per sub-processor with a link to their public security overview + SOC 2 / ISO status.                                                                                                                                                                                                                                                                  |
| `penetration-test.pdf`      | (Accrual-dependent — Y2 milestone.) Third-party pen-test results.                                                                                                                                                                                                                                                                                               |

**Source of truth:**

- Headers + RLS + audit posture → `next.config.ts`, `supabase/migrations/*`, `lib/admin/audit.ts`.
- Sub-processor list → [`docs/legal/SUB_PROCESSORS.md`](../legal/SUB_PROCESSORS.md).
- Env var matrix → [`docs/CREDENTIALS.md`](../CREDENTIALS.md).

**Refresh cadence:** quarterly; immediately on any sub-processor add/remove.

---

## 05-ownership — IP ownership, employment, prior commits

**Purpose:** the buyer's legal lead checks here. They want: clean IP chain (no employer claims, no consultant gaps, no GPL viral contamination); employment / contractor agreements that clearly assign IP to the selling entity; prior-art claims to flag.

**Files in this folder:**

| File                        | Description                                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ip-ownership-statement.md` | Seller's representation that 100% of source code in the repository was authored by the seller, free of prior-employer IP claims, no contracting agreement covers the work.                           |
| `contributors.md`           | List of every Git contributor to `main`. Today: 1 (`balaji@kimp.xyz`). If contractors are added pre-listing, their IP-assignment agreement is filed alongside.                                       |
| `oss-licenses.md`           | Inventory of all open-source dependencies + their licenses (auto-generated via `pnpm licenses list`). Flags any non-permissive licenses (none expected; the stack is MIT / Apache / BSD throughout). |
| `trademark-status.md`       | Trademark filing status for "Trendly" and any associated marks. Pre-listing: not filed.                                                                                                              |
| `domain-ownership.md`       | Domain registrar + WHOIS record (with privacy enabled).                                                                                                                                              |
| `contractor-agreements/`    | (Accrual-dependent.) Signed IP-assignment + NDA for any contractor work.                                                                                                                             |

**Source of truth:**

- Contributor list → `git shortlog -s -n`.
- OSS licenses → `pnpm licenses list --prod --json`.
- Domain → registrar dashboard.

**Refresh cadence:** pre-listing snapshot at W14; otherwise on any change.

---

## 06-legal — ToS, Privacy, DPA, sub-processors, compliance

**Purpose:** the buyer's compliance lead checks here. They want: enforceable ToS (especially around user-generated content, franchise-IP risk, refunds); GDPR-ready Privacy Policy; signed DPA template; sub-processor list; takedown SOP; refund SOP; published cookie policy.

**Files in this folder:**

| File                  | Description                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terms-of-service.md` | Pointer to [`docs/TERMS_OF_SERVICE.md`](../TERMS_OF_SERVICE.md). §3 (personal-use only) + §4 (style references + takedown protocol) are load-bearing for franchise-IP risk. |
| `privacy-policy.md`   | Pointer to [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md).                                                                                                                |
| `dpa-template.md`     | Pointer to [`docs/legal/DPA_TEMPLATE.md`](../legal/DPA_TEMPLATE.md).                                                                                                        |
| `sub-processors.md`   | Pointer to [`docs/legal/SUB_PROCESSORS.md`](../legal/SUB_PROCESSORS.md).                                                                                                    |
| `takedown-sop.md`     | Pointer to [`docs/sops/takedown.md`](../sops/takedown.md).                                                                                                                  |
| `refund-sop.md`       | Pointer to [`docs/sops/refund_request.md`](../sops/refund_request.md).                                                                                                      |
| `trend-banlist.md`    | Pointer to [`docs/TREND_BANLIST.md`](../TREND_BANLIST.md) — the explicit franchise-IP banlist.                                                                              |
| `dmca-history.md`     | (Accrual-dependent — populated as DMCA notices arrive post-launch.)                                                                                                         |
| `disputes-log.md`     | (Accrual-dependent.) Stripe chargeback log + resolution status.                                                                                                             |

**Source of truth:**

- All policies live in `docs/` and are versioned in git.
- Trend banlist is in `docs/TREND_BANLIST.md` and is also enforced server-side in the trend-create form (admin can't insert a banlisted slug).
- DMCA + dispute logs accrue post-launch.

**Refresh cadence:** ToS + Privacy on material change (with 14-day customer notice); DMCA + disputes as they happen.

---

## 07-runbooks — How the operator runs the business day-to-day

**Purpose:** the buyer's operations lead checks here. They want: can a new operator pick this up without the seller's tribal knowledge? What's the daily/weekly/monthly workflow? What happens when something goes wrong?

**Files in this folder:**

| File                   | Description                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `mvp-runbook.md`       | Pointer to [`docs/RUNBOOK.md`](../RUNBOOK.md) — credential onboarding + 14-test verification matrix.          |
| `daily-ops.md`         | Pointer to [`docs/sops/daily_ops.md`](../sops/daily_ops.md).                                                  |
| `new-trend-weekly.md`  | Pointer to [`docs/sops/new_trend_weekly.md`](../sops/new_trend_weekly.md).                                    |
| `refund-request.md`    | Pointer to [`docs/sops/refund_request.md`](../sops/refund_request.md).                                        |
| `takedown.md`          | Pointer to [`docs/sops/takedown.md`](../sops/takedown.md).                                                    |
| `incident-response.md` | Pointer to [`docs/sops/incident_response.md`](../sops/incident_response.md).                                  |
| `launch-checklist.md`  | Pointer to [`docs/LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md).                                              |
| `bundle-analysis.md`   | Pointer to [`docs/BUNDLE_ANALYSIS.md`](../BUNDLE_ANALYSIS.md).                                                |
| `incidents-log.md`     | Pointer to [`docs/incidents/README.md`](../incidents/README.md) — postmortem index. "No incidents yet" today. |

**Source of truth:**

- All SOPs versioned in git under `docs/sops/`.
- Incidents folder populated by the founder per the incident-response SOP.

**Refresh cadence:** SOPs on material change; incidents log on every sev-1 / sev-2.

---

## 08-transferability — Per-account cutover plan

**Purpose:** the buyer's onboarding lead reads this last. They want: a clear, account-by-account checklist of what to do on Day 1 / Day 7 / Day 14 to take over the business cleanly.

**Files in this folder:**

| File                           | Description                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `per-account-transfer-plan.md` | Pointer to [`docs/transferability/per-account-transfer-plan.md`](../transferability/per-account-transfer-plan.md). Per-account ETA + risk + buyer pre-requisites. |
| `post-acquisition-timeline.md` | Pointer to [`docs/transferability/post-acquisition-timeline.md`](../transferability/post-acquisition-timeline.md). Day-by-day sequencing.                         |
| `credentials-reference.md`     | Pointer to [`docs/CREDENTIALS.md`](../CREDENTIALS.md).                                                                                                            |
| `seller-availability.md`       | Seller's commitment to the 30-day advisory window post-close: response SLA, escalation contact, hourly cap (if any).                                              |

**Source of truth:**

- Transferability docs live under `docs/transferability/`.

**Refresh cadence:** pre-listing snapshot at W14; updated on any account-level change.

---

## Files to add post-W14 (accrual-dependent)

These files cannot exist today because the underlying data hasn't accrued yet. Buyer should expect them at the dates noted.

| File                     | Folder            | Accrues by                   | Source                                         |
| ------------------------ | ----------------- | ---------------------------- | ---------------------------------------------- |
| `financial-model.xlsx`   | 01-financial      | W14 (3 months post-launch)   | Hand-built from 3 months of Stripe + cost data |
| `cohort-retention.csv`   | 01-financial      | W12 (8 weeks post-launch)    | PostHog retention export                       |
| `testimonials.md`        | 02-customers      | W10                          | Customer outreach + consent log                |
| `screenshots/`           | 02-customers      | W10                          | Standout user outputs (with consent)           |
| `retention-cohorts.png`  | 03-product        | W12                          | PostHog screenshot                             |
| `nps-results.md`         | 03-product        | post-launch survey           | Tally / Typeform export                        |
| `penetration-test.pdf`   | 04-infrastructure | Y2 milestone                 | Third-party pen-test vendor                    |
| `contractor-agreements/` | 05-ownership      | as contractors join          | Signed PDFs                                    |
| `dmca-history.md`        | 06-legal          | as DMCA notices arrive       | Email + response archive                       |
| `disputes-log.md`        | 06-legal          | as Stripe chargebacks arrive | Stripe Dashboard export                        |
| `traffic-stats.md`       | 02-customers      | W10                          | Vercel Analytics + PostHog                     |
| `seo-rankings.csv`       | 02-customers      | W12                          | Ahrefs / Semrush export                        |

---

## How to use this data room

Recommended buyer flow:

1. **Start with the architecture.** Read `data-room/README.md` (this file), then [`04-infrastructure/architecture.md`](../ARCHITECTURE.md) end-to-end. You should be able to draw the system diagram from memory before continuing.
2. **Then the financials.** Read [`01-financial/`](#01-financial--revenue-costs-unit-economics) for revenue + cost. Sanity-check unit economics against the architecture (Gemini cost line × generation volume should reconcile to Stripe gross within ~5%).
3. **Then product depth.** Read [`03-product/`](#03-product--architecture-roadmap-retention-proof) for retention proof. If retention curves are absent, ask the seller for raw PostHog access (read-only).
4. **Then legal + transferability.** Read [`06-legal/`](#06-legal--tos-privacy-dpa-sub-processors-compliance) for risk (especially the trend banlist + DMCA history) and [`08-transferability/`](#08-transferability--per-account-cutover-plan) for cutover feasibility.
5. **Then operational depth.** Read [`02-customers/`](#02-customers--user-base-retention-support) for who the users are, and [`07-runbooks/`](#07-runbooks--how-the-operator-runs-the-business-day-to-day) for how the operator runs the business.
6. **Finally ownership.** [`05-ownership/`](#05-ownership--ip-ownership-employment-prior-commits) is short but load-bearing — verify the IP chain is clean.

Total reading time at moderate pace: 2-3 hours for first pass; another 2-3 hours of follow-up questions to seller for any clarification.

---

## Cross-references

- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — system architecture (lives outside data-room because it's also a working internal doc).
- [`docs/RUNBOOK.md`](../RUNBOOK.md) — credential onboarding + verification matrix.
- [`docs/CREDENTIALS.md`](../CREDENTIALS.md) — env var matrix.
- [`docs/transferability/per-account-transfer-plan.md`](../transferability/per-account-transfer-plan.md) — per-vendor cutover.
- [`docs/legal/SUB_PROCESSORS.md`](../legal/SUB_PROCESSORS.md) — sub-processor list.
- [`docs/incidents/README.md`](../incidents/README.md) — incidents log.
