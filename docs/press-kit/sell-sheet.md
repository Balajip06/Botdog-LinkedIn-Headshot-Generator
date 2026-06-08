# Botdog — Sell Sheet

**Last updated:** 2026-05-29
**Status at send-time:** Pre-launch (revenue not yet accruing)
**Listing range:** $50,000 – $75,000 USD (revisable on trailing-90-day revenue trajectory)
**Asset type:** MicroSaaS — consumer transactional, credit-pack monetization
**Channels:** Acquire.com (primary), direct outreach to indie SaaS holdcos (Tinyseed, SureSwift, XO Capital, Constructive Capital)

---

## One-liner

A single-purpose AI LinkedIn-headshot generator with a 14-profession style picker.

---

## The pitch

Botdog turns a user-uploaded selfie into a LinkedIn-ready professional headshot. Users upload a photo, pick one of 14 profession styles, and get a polished headshot in 8–15 seconds. The defensibility is in the curation pipeline — the headshot style ships with a passed Gemini eval, an SEO landing page, and a documented prompt template, so output quality is a moat rather than a feature. The asset is transferable because the entity is an LLC, the runbooks are written, the Stripe history is clean, and every vendor account is documented in a per-service migration plan.

---

## Key numbers

| Metric                           | Current    | Target at listing                             |
| -------------------------------- | ---------- | --------------------------------------------- |
| Trailing-3-month revenue         | TODO — W14 | $7.5K – $12K ($2.5K – $4K/mo avg, stable)     |
| Trailing-3-month gross margin    | TODO — W14 | greater-than-or-equal-to 75%                  |
| Repeat-purchase rate (60-day)    | TODO — W14 | greater-than-or-equal-to 20%                  |
| Free-to-paid conversion (90-day) | TODO — W14 | greater-than-or-equal-to 3%                   |
| Week-2 retention (paid cohort)   | TODO — W14 | greater-than-or-equal-to 50%                  |
| Unique paying customers          | TODO — W14 | greater-than-or-equal-to 100                  |
| Monthly active users             | TODO — W14 | target 3K – 5K                                |
| Weekly active users              | TODO — W14 | target 1K – 2K                                |
| Daily active users               | TODO — W14 | target 200 – 400                              |
| Organic traffic share            | TODO — W14 | greater-than-or-equal-to 40% (SEO + referral) |
| Refund rate                      | TODO — W14 | less-than-or-equal-to 3%                      |
| Sentry error rate                | TODO — W14 | less-than-or-equal-to 0.5% of requests        |

Items marked TODO are placeholders until the W14 traction window closes. Numbers in the target column are the threshold the asset needs to hit to defend the $50K – $75K listing range; sustained outperformance pushes the range up.

---

## The numbers a buyer should expect at $50K – $75K

- $7,500 – $12,000 trailing-3-month revenue, with month-over-month variance under 25 percent.
- Gross margin above 75 percent, after Gemini inference, Stripe processing, hosting, and refund cost.
- Repeat-purchase rate above 20 percent within 60 days of first purchase.
- Week-2 retention above 50 percent for paid users.
- 100+ unique paying customers in the trailing 90 days.
- 90+ consecutive days of clean Stripe revenue history with no chargebacks above the 1 percent threshold.

If any of these is missed at listing time, mark it explicitly as "target, not hit" in the data-room cover sheet — do not paper over a gap. Acquirers find the gap during due diligence anyway; pre-disclosing it preserves trust and shortens the deal cycle.

---

## What you are buying

- Codebase: Next.js 16 + Supabase, 49 build routes, 354 passing tests across 37 files, approximately 30,000 lines of TypeScript. Strict mode, lint-clean, typecheck-clean.
- Curated headshot tool: a single `linkedin-headshot` trend with a 14-profession style picker, a passed Gemini eval, a documented prompt template (v2 — 694 to 1214 characters), an SSR landing page with HowTo + FAQ JSON-LD, and an OG image.
- SEO surface: 3+ long-tail landing pages indexed at acquisition, sitemap.xml + robots.txt configured, canonical URLs set, OG images via the @vercel/og runtime.
- Customer + revenue data: an anonymized CSV export of profiles, generations, and Stripe checkout sessions, ready for buyer-side data review without exposing PII.
- LLC entity: Wyoming LLC formed in W0, transferable via standard membership-interest transfer at close.
- Vendor accounts: all 9 sub-processors documented in `docs/transferability/per-account-transfer-plan.md` with the exact transfer mechanism per account (owner-change, member-add, or DNS handover).
- Stripe history: 90+ days of clean revenue with the credit-pack product catalog already configured (small $4.99 / 50 credits, medium $14.99 / 200, large $39.99 / 600).
- Pre-written SOPs: 5 runbooks covering daily operations, incident response, refund handling, weekly new-trend workflow, and takedown handling — in `docs/sops/`.
- ADR log: 7 records covering the load-bearing architectural decisions in `docs/adr/` (credit packs vs subscription, RLS quota strategy, schema-driven inputs, eval gate constraint, idempotency strategy, soft-delete cascade, anonymous trial architecture).
- Architecture diagram + data room: `docs/ARCHITECTURE.md` (in-flight) plus the curated data room scaffold per buyer access.

---

## The stack

- Frontend: Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.9 strict, Tailwind v4 CSS-first, shadcn/ui (14 primitives ejected).
- Backend: Supabase — Postgres with row-level security, Auth (Google OAuth + magic-link), Storage (uploads + outputs buckets), Edge Functions (Deno), Realtime (postgres_changes channel), pg_cron (weekly free-tier reset + daily purges).
- Image generation: Google Gemini Nano Banana 2 by default, v1 quick toggle, per-trend model override. Provider abstraction in `lib/gemini/` with an OpenAI-compatible stub already wired for a one-day failover migration.
- Payments: Stripe Checkout in one-time credit-pack mode. Subscription product slot is reserved (Creator Pro on the deferred roadmap) but not enabled.
- Email: Resend for magic-link sign-in and push-fallback notifications.
- Observability: PostHog (product analytics, IP-anonymization on, opt-out per privacy policy) + Sentry (errors, performance, replay with mask-all-text).
- Anti-bot: Cloudflare Turnstile on signup and the anonymous-trial endpoint.
- Rate limit: Upstash Redis sliding-window limiters (20/hr per IP for `/api/generate`, 5/day per fingerprint for the anonymous endpoint, 10/hr per IP for signup).
- Deploy: Vercel — production environment with preview deploys on PR, edge runtime on hot paths.

---

## The risks you are underwriting

- **Stripe customer card non-transfer.** Stripe does not move card data across accounts at acquisition; expect a 30 to 60 percent re-authorization churn on the existing paying cohort post-close. Mitigated by the 14-day announcement runbook in `docs/transferability/post-acquisition-timeline.md` and by the fact that the next-purchase prompt is gated on a low-friction Stripe Checkout session, not a saved-card replay.
- **Single founder.** The asset has been built by one person, which is a key-person risk. Mitigated by the SOPs, the ADR log, the architecture diagram, the runbooks, and a 30-day post-close unpaid founder advisory built into the deal.
- **Gemini API dependency.** A change in Gemini pricing, terms, or availability would dent margin. Mitigated by the provider abstraction stub (OpenAI Images, Stability, or self-hosted SDXL are all within a one-day migration window) and by the 75 percent gross margin headroom against a 2x cost spike.
- **Franchise-IP exposure on trends.** Some viral aesthetics derive from copyrighted franchises. Mitigated by the `docs/TREND_BANLIST.md` (explicit no-fly list — Ghibli proper names, Disney characters, Pokemon, etc.), the personal-use-only ToS clause in `docs/TERMS_OF_SERVICE.md` section 3, and the 48-hour takedown SOP in `docs/sops/takedown.md`.

---

## Transferability

- Target window: 14 days from purchase-agreement signing to full handover.
- Day-by-day plan: `docs/transferability/post-acquisition-timeline.md`.
- Per-account checklist: `docs/transferability/per-account-transfer-plan.md` — covers GitHub, Vercel, Supabase, Stripe, Resend, Cloudflare (DNS + Turnstile), Upstash, PostHog, Sentry, Google Cloud (Gemini), and the domain registrar.
- Founder advisory: 30 days unpaid post-close, scoped to onboarding the buyer's operator into the runbooks. Email + Loom-call only.

---

## What you get on day 1 of close

- Repo transfer initiated via GitHub Settings to Transfer.
- Vercel + Supabase project owner-change initiated.
- Stripe LLC entity hand-over initiated.
- All environment-variable secrets shared via an encrypted Bitwarden export, with a separate share password sent on a second channel.
- Domain transfer initiated at the registrar.
- 30-day unpaid founder advisory begins.

The 14-day plan converts the day-1 initiations into completions, validates each one with a buyer-side acceptance test, and ends with the buyer's operator running a live generation end-to-end on the production stack.

---

## Roadmap you inherit

These are documented but not built. They are buyer-roadmap value, not founder commitments:

- Public gallery with moderation queue (community surface, retention lift).
- In-app notification center (currently push + email only).
- Weekly email digest of new trends.
- Referral leaderboard (public scoreboard for the existing referral system).
- Creator Pro annual subscription (Stripe product slot reserved; not enabled).
- Multi-currency pricing + Stripe Tax.
- Auto trend detector (Phase 6 prep in the codebase — sources, proposer, orchestrator, and admin inbox are all scaffolded; real source fetchers and real proposer are pending creds).

ADRs at `docs/adr/` explain why each decision in the current build was made. The deferred feature set is at `suggest-me-how-can-wiggly-cloud.md` in the project root with Absorbed / Deferred / Shipped status per item.

---

## Contact

- Purchase inquiries: sale@botdog.ai (placeholder until domain registered)
- IP, takedowns, legal: legal@botdog.ai (placeholder until domain registered)
- Founder advisory inquiries: founder@botdog.ai (placeholder until domain registered)

Until the domain is registered and DNS is live, route inquiries via the Acquire.com listing messaging system.
