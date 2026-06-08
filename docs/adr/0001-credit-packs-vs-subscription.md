# ADR 1: One-time credit packs as the launch monetization model

Date: 2026-05-29
Status: Accepted

## Context

Botdog is a consumer-facing AI LinkedIn-headshot generator. Pricing model had to be decided at MVP so [lib/payments/packs.ts](../../lib/payments/packs.ts), the Stripe Checkout flow ([app/api/stripe/checkout/route.ts](../../app/api/stripe/checkout/route.ts)), and the credit-balance schema ([supabase/migrations/20260527000001_profiles.sql](../../supabase/migrations/20260527000001_profiles.sql)) could be built around it.

Constraints from the amended plan:

- The asset is being prepared for an Acquire.com / direct-holdco sale at the $50–75K tier — not a venture-backed growth story. Optimizing for revenue _stability_ over revenue _spikes_.
- Solo builder; no support team; refund-rate has a direct hit on margin.
- Consumer image-gen carries strong "tried once, churned" behavior. Forcing a recurring subscription on the first interaction has well-documented chargeback risk in this category.
- The diligence math (ultrareview) cleared 0.8–1.5x ARR multiples for credit-pack microSaaS vs 3.5–5x for true subscription SaaS. We accepted the lower multiple deliberately because it's achievable; the higher one is fiction without a real subscription product.

## Decision

Ship **three one-time credit packs**: $4.99 / 50 credits, $14.99 / 200 credits, $39.99 / 600 credits. Credits never expire. The free tier refills 5 generations every Sunday 00:00 UTC.

An annual **Creator Pro** subscription ($99/yr) ships in W3 of the pre-sale plan — explicitly as a _second_ product alongside credit packs, not a replacement. The two coexist:

- Pro unlocks watermark-removal + HD/4K + unlimited generations.
- Credit packs remain the no-commitment buy-in for trial users.

A $2/mo watermark-removal micro-sub also ships in W3 as a low-friction upsell from the free tier.

## Consequences

**Positive:**

- Lowest possible commitment for first-time users → highest free→paid conversion. Industry benchmark for credit-pack consumer SaaS is 2–5%; subscriptions hover at 0.5–1.5%.
- Refund liability is bounded per transaction. A $4.99 refund is recoverable; a $99/yr refund-after-cancel is a 12-month hit.
- "Credits don't expire" is a strong trust signal in the listing pitch. Buyers know the user base isn't being silently bled by lapsed subscriptions.
- The Stripe webhook ([app/api/stripe/webhook/route.ts](../../app/api/stripe/webhook/route.ts)) handles a single `checkout.session.completed` event type at MVP — fewer edge cases than subscription billing (proration, dunning, plan changes, mid-cycle upgrades).

**Negative:**

- No predictable MRR. Cohort revenue is lumpy; quarter-over-quarter forecasting is harder.
- Acquire.com multiple ceiling at ~1.5x ARR-equivalent. We sacrificed ~2x upside vs a true subscription product.
- Repeat-purchase rate becomes the substitute "churn" metric in diligence — we have to actively measure and surface it (Dashboard A revenue cohorts, W2).
- Customers who buy the smallest pack ($4.99) often never come back. This is unfixable structurally — only mitigation is upsell-at-quota (W2) + Creator Pro (W3).

## Alternatives considered

**Monthly subscription only ($9.99/mo unlimited).** Rejected: too-high commitment for first-time users; conversion drops 3–5x in this category. Also Stripe's chargeback-risk classification for "consumer AI art subscriptions" is high, which would have made KYC and live-mode approval slower.

**Per-image pricing ($0.10 per generation).** Rejected: Stripe transaction fees ($0.30 + 2.9%) destroy margin on sub-$1 transactions. Would require a wallet/balance layer that's effectively the credit-pack system in disguise.

**Free + ads.** Rejected: ad inventory for image-gen is undeveloped, brand-safety is a nightmare given franchise-IP risk, and the LTV per ad-impression user is roughly $0.50 — below the per-generation Gemini cost.
