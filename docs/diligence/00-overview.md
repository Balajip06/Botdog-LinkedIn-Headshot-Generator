# Trendly — Diligence Pack Overview

**Last refreshed:** 2026-05-29
**Owner:** `balaji@kimp.xyz` (seller)
**Companion folders:** [`docs/data-room/`](../data-room/README.md), [`docs/transferability/`](../transferability/per-account-transfer-plan.md)

This folder is the **fast-response layer** for buyer diligence. When a buyer asks a question, the answer is either already here as a one-pager, or the one-pager points to the canonical source (data-room export, transferability runbook, ADR, SOP). The goal: 80% of inbound diligence questions answered without thinking.

---

## Asset 1-pager

**Trendly** is a viral-trend image generator. A user picks a trend (e.g. "Pixar-style portrait", "vintage Polaroid"), uploads a photo or fills a schema-driven form, and gets back a generated image they can download or share. Free tier: 5 generations / week (server-watermarked). Paid: one-time credit packs ($4.99 / $14.99 / $39.99).

**Stack (locked, no exotic dependencies):**

- Frontend: Next.js 16 App Router (Turbopack), React 19, TypeScript 5.9 strict, Tailwind v4, shadcn/ui.
- Backend: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions + pg_cron).
- AI: Google Gemini (Nano Banana Pro). Abstracted behind a provider interface (`lib/image-provider/`) — see [04-tech-defensibility.md](04-tech-defensibility.md).
- Payments: Stripe Checkout (one-time, USD).
- Email + Push: Resend + Web Push (VAPID).
- Observability: PostHog + Sentry.
- Hosting: Vercel.

**Tech defensibility — one paragraph.** Trendly is portable. The image model is abstracted behind `lib/image-provider/index.ts` (Gemini default, OpenAI Images stub already in place). Supabase usage is standard Postgres + RLS + Storage — portable to Neon/S3 in 1–2 weeks. The only deep lock-in is Stripe (customer card data does not transfer between Stripe accounts), which is addressed via LLC formation Day 1 + a pre-built re-auth email cadence — see [03-stripe-card-non-transfer.md](03-stripe-card-non-transfer.md). Test stack is Vitest + Playwright (open-source, no SaaS subscription). 283/283 tests passing on `main`.

---

## Anticipated buyer questions (~25)

Grouped by diligence workstream. Each row links to the canonical answer. If the answer is "see file X," that file lives in this folder (`docs/diligence/`), in `docs/data-room/`, or in `docs/transferability/`.

### Product

| #   | Question                                 | Answer source                                                                                                                                    |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | What does Trendly actually do?           | [Asset 1-pager](#asset-1-pager) above + [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)                                                             |
| 2   | How many trends are live? Which perform? | [`docs/data-room/02-customers/top-trends.csv`](../data-room/README.md#02-customers--user-base-retention-support) (accrual-dependent post-launch) |
| 3   | What's the user journey end-to-end?      | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §Request flow                                                                                       |
| 4   | What's the moderation / abuse story?     | [`docs/sops/takedown.md`](../sops/takedown.md) + [`docs/TREND_BANLIST.md`](../TREND_BANLIST.md)                                                  |
| 5   | What's planned next (roadmap)?           | [`docs/data-room/03-product/roadmap.md`](../data-room/README.md#03-product--architecture-roadmap-retention-proof)                                |

### Revenue

| #   | Question                                          | Answer source                                                                                                                                                                                                            |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6   | Can we see a Stripe payouts export?               | [01-stripe-export-runbook.md](01-stripe-export-runbook.md)                                                                                                                                                               |
| 7   | What's the refund rate?                           | [01-stripe-export-runbook.md](01-stripe-export-runbook.md) §Refund-rate calculation                                                                                                                                      |
| 8   | Are the dashboards real or mock?                  | [02-mock-vs-real-explainer.md](02-mock-vs-real-explainer.md)                                                                                                                                                             |
| 9   | What's gross margin per credit pack?              | [`docs/data-room/01-financial/unit-economics.md`](../data-room/README.md#01-financial--revenue-costs-unit-economics)                                                                                                     |
| 10  | What's monthly recurring (it's not subscription)? | [`docs/data-room/01-financial/revenue-by-month.csv`](../data-room/README.md#01-financial--revenue-costs-unit-economics) + [`docs/adr/0001-credit-packs-vs-subscription.md`](../adr/0001-credit-packs-vs-subscription.md) |
| 11  | What's the anonymous-trial cost guardrail?        | `ANONYMOUS_DAILY_BUDGET_USD` env var (default $20/day, in [`lib/env.ts`](../../lib/env.ts))                                                                                                                              |

### Tech

| #   | Question                                   | Answer source                                                                                                                                                                                    |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 12  | How portable is the stack?                 | [04-tech-defensibility.md](04-tech-defensibility.md)                                                                                                                                             |
| 13  | What's the single-provider risk?           | [04-tech-defensibility.md](04-tech-defensibility.md) §Gemini dependency                                                                                                                          |
| 14  | What's RLS / quota enforcement look like?  | [`docs/adr/0002-rls-quota-strategy.md`](../adr/0002-rls-quota-strategy.md)                                                                                                                       |
| 15  | How are duplicate Stripe webhooks handled? | [`docs/adr/0005-idempotency-strategy.md`](../adr/0005-idempotency-strategy.md)                                                                                                                   |
| 16  | Where are the secrets stored?              | [`docs/CREDENTIALS.md`](../CREDENTIALS.md)                                                                                                                                                       |
| 17  | What's the test coverage / quality?        | [`docs/data-room/03-product/changelog.md`](../data-room/README.md#03-product--architecture-roadmap-retention-proof) (`pnpm test` → 283/283, `pnpm typecheck` + `pnpm lint` + `pnpm build` clean) |

### Legal

| #   | Question                                         | Answer source                                                                                                                                           |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18  | What's the ToS say about user-generated content? | [`docs/TERMS_OF_SERVICE.md`](../TERMS_OF_SERVICE.md) §3–§4                                                                                              |
| 19  | GDPR posture?                                    | [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) + [`docs/legal/DPA_TEMPLATE.md`](../legal/DPA_TEMPLATE.md)                                             |
| 20  | Sub-processor list?                              | [`docs/legal/SUB_PROCESSORS.md`](../legal/SUB_PROCESSORS.md)                                                                                            |
| 21  | IP ownership chain?                              | [`docs/data-room/05-ownership/ip-ownership-statement.md`](../data-room/README.md#05-ownership--ip-ownership-employment-prior-commits)                   |
| 22  | DMCA history?                                    | [`docs/data-room/06-legal/dmca-history.md`](../data-room/README.md#06-legal--tos-privacy-dpa-sub-processors-compliance) (accrual-dependent post-launch) |

### Transferability

| #   | Question                                                | Answer source                                                                                                                                              |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | What does the Day 1 / Day 7 / Day 14 cutover look like? | [`docs/transferability/post-acquisition-timeline.md`](../transferability/post-acquisition-timeline.md)                                                     |
| 24  | What's the Stripe gap and how big is the risk?          | [03-stripe-card-non-transfer.md](03-stripe-card-non-transfer.md)                                                                                           |
| 25  | Will the seller stay around to help?                    | [`docs/data-room/08-transferability/seller-availability.md`](../data-room/README.md#08-transferability--per-account-cutover-plan) (30-day advisory window) |

---

## What's in this folder vs `docs/data-room/` vs `docs/transferability/`

These three folders have related but distinct purposes. Send the right one for the right question.

| Folder                                                                     | Audience                                    | Use it when…                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/diligence/` (this folder)                                            | Buyer's lead diligence person               | They ask a frequently-anticipated question. You want a one-pager you can paste into an email or share as a link.                               |
| [`docs/data-room/`](../data-room/README.md)                                | Buyer's finance / legal / engineering leads | They've signed NDA and want the canonical exports (revenue CSV, customer counts, IP statement). Source of truth for numbers + legal artifacts. |
| [`docs/transferability/`](../transferability/per-account-transfer-plan.md) | Buyer's onboarding lead                     | They've signed the deal and want the Day-1 runbook for every account. Per-vendor mechanism + ETA + risk.                                       |

**Rule of thumb.** Diligence folder = "the answer." Data-room = "the receipt." Transferability = "the handover map."

---

## How to use during diligence

When buyer sends a question, find it in the table above and send the matching file. If the question is unanticipated:

1. **First check** — is there an ADR for it? (`docs/adr/`). ADRs encode "why we built it this way" and are good for tech depth questions.
2. **Second check** — is there an SOP for it? (`docs/sops/`). SOPs encode "how we run it day-to-day" and are good for operations questions.
3. **Third check** — is there a data-room file for it? See [`docs/data-room/README.md`](../data-room/README.md) for the folder map.
4. **If still not found** — answer in plain English, then add a new one-pager to this folder for next time. Diligence answers are reusable across buyers.

**One file per response.** Don't send a buyer 6 files when 1 file would do. The diligence one-pagers are designed to be self-contained — each links out to deeper sources if the buyer wants to dig.

**Volume.** Expect 20–50 questions across the diligence cycle for a $50–75K listing. The first 25 are anticipated above. The remaining 25 are unique to each buyer's thesis.

---

## Cross-references

- [`docs/data-room/README.md`](../data-room/README.md) — master index for the full data room.
- [`docs/transferability/per-account-transfer-plan.md`](../transferability/per-account-transfer-plan.md) — per-account cutover playbook.
- [`docs/transferability/post-acquisition-timeline.md`](../transferability/post-acquisition-timeline.md) — day-by-day handover sequence.
- [`docs/RUNBOOK.md`](../RUNBOOK.md) — 14-test verification matrix.
- [`docs/CREDENTIALS.md`](../CREDENTIALS.md) — env var reference.
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — system architecture.
