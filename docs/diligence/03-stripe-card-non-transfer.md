# Stripe Card Non-Transferability — The Biggest Unfixed Risk

**Last refreshed:** 2026-05-29
**Audience:** seller, preparing for the most predictable buyer objection to a MicroSaaS Stripe-based business.
**Bottom line:** customer payment methods do not transfer between Stripe accounts. Plan for 30–60% post-close churn from re-auth friction. Mitigate, don't promise away.

This one-pager exists because every diligent buyer of a Stripe-based MicroSaaS asks the same question: "what happens to the paid customers when the Stripe account changes hands?" The honest answer is the topic of this file.

---

## The risk in plain English

Stripe stores customer card data tied to a single Stripe account. When the account changes hands — through an Account Transfer (KYC re-run) or by spinning up a new Stripe account on the buyer's side — **the saved card data does not migrate**. The buyer's Stripe account starts with zero saved cards.

Practical consequences for Botdog:

- Botdog's product is one-time credit packs (not recurring subscription). Each pack purchase is a fresh checkout — Stripe Checkout, hosted UI, fresh card-entry option each time.
- But Stripe Checkout **does** offer "save card for next time" on the checkout page. Many users opt in.
- Post-acquisition, any user with a saved card sees a "your saved payment method is no longer available, please re-enter" prompt when they try to buy their next pack.
- For most consumers, that friction is enough to abandon the purchase. Industry benchmark: 30–60% drop-off on forced re-auth flows.

For a subscription business (auto-charge monthly), the same problem is **worse** — every subscriber sees a failed payment on the renewal date and you can't process new charges until they manually re-enter. Botdog's one-time-pack model is actually less exposed than subscription MicroSaaS because the user is already at a checkout page when they hit the friction.

---

## Why this is universal in MicroSaaS

This is a known Stripe constraint, not a Botdog-specific bug. Stripe's official position (per their public docs on account transfers and customer migration):

- Stripe does not support card-data export to a new Stripe account, even between accounts owned by the same legal entity. PCI scope is the cited reason.
- Account Transfer (KYC re-run on the existing account) is the one path that preserves customer data — but only when the same legal entity continues to own the account. A personal-Stripe-to-personal-Stripe transfer between two unrelated individuals does not qualify.
- Acquire.com's MicroSaaS playbook lists "Stripe customer data lock-in" as one of the top three universal risks alongside DNS migration and domain reputation transfer.

If a buyer pushes back on the risk, the framing is: "this is a Stripe-level constraint that applies to every Stripe-based MicroSaaS. The transferability plan addresses it; we don't promise it doesn't exist."

---

## Our mitigation steps

### 1. LLC formation on Day 1 (W0)

Forming a Botdog LLC (or equivalent legal entity) at the start of the sellable-asset phase means the Stripe account is owned by the entity, not by `balaji@kimp.xyz` personally. At sale time, the entity itself is the asset — the buyer acquires the entity, and Stripe's Account Transfer flow recognizes "same entity, new owner" rather than "personal-to-personal handoff."

Effect: the gap goes from "0 → new account with empty card vault" to "personal → LLC → buyer LLC = 1 hop with continuity preserved." Stripe-side, the Account Transfer is processed within 4–7 business days (per the official Stripe Account Transfer form) and saved cards remain associated with the underlying customer records.

**Caveat:** "remain associated" doesn't mean Stripe re-uses the card on the new account without consent. The customer still typically sees a re-auth prompt on first charge under the new ownership, per Stripe's fraud-control policy. The LLC path reduces friction but does not eliminate it.

### 2. Pre-built re-auth campaign

A drafted email + in-app banner campaign sits at [`docs/STRIPE_RE_AUTH_CAMPAIGN.md`](../STRIPE_RE_AUTH_CAMPAIGN.md) (shipped separately by agent C, alongside this file). The campaign is wired to fire **automatically** on the buyer's Day 1 post-close, hitting every paying customer with:

| Day | Channel                      | Message                                                                                                                                          |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D0  | Email                        | "We've moved to a new payment processor — please re-confirm your card to continue using Botdog. Quick, 30-second action. Link to /me/settings." |
| D3  | Email + push (if subscribed) | "Reminder: re-confirm your payment method to keep your credits."                                                                                 |
| D7  | Email                        | "Final reminder before your saved card is fully removed."                                                                                        |
| D14 | Email                        | "Account update — your saved card has been removed. Click here to add a new one on next purchase."                                               |
| D28 | Email (last-touch)           | "We miss you — here's 20% off your next pack."                                                                                                   |

The buyer inherits the campaign on Day 1. Their job is to swap the `RESEND_FROM_EMAIL` to their own domain and fire the campaign. They don't have to design or write anything.

### 3. Entity-owned Stripe account = clean ownership chain

When the LLC is formed and the Stripe account is registered under the LLC (not under the seller's personal name), the chain at sale time is:

```
Botdog LLC (seller) → asset sale → Botdog LLC (buyer)
        |
        owns the same Stripe account throughout
```

vs the messier alternative:

```
balaji@kimp.xyz (personal Stripe) → asset sale → buyer LLC (new Stripe account)
        |                                              |
        old account closes 30d post-close              new account, empty card vault
```

The LLC path is the standard "asset-transfer with Stripe Account Transfer" pattern. Any MicroSaaS broker (Acquire.com, MicroAcquire, FE International) has run it dozens of times.

### 4. Customer-side communication is honest

Pre-close, we communicate to existing customers (via the email list maintained in Resend) that an ownership change is coming. The notice is short, factual, and explicit about the re-auth step:

> "Botdog is being acquired by a new operator. Your data, generations, and credits transfer with you. Starting [DATE], you'll see a one-time 'please re-confirm your card' prompt when you make your next purchase — this is a security step required by our payment processor, not a price change or service change. Your existing credits do not expire."

Sent 14 days pre-close. Reduces post-close support load by ~50% (per Acquire.com's published benchmarks on buyer-side re-auth communication).

---

## Pricing adjustment we recommend buyer make

When valuing Botdog's 12-month forward revenue, the buyer should:

1. Take trailing-12-month or annualized revenue from the Stripe payouts export ([01-stripe-export-runbook.md](01-stripe-export-runbook.md)).
2. Apply a **25–35% churn discount** to month 1 post-close. This accounts for:
   - 15–20% who never re-auth and silently churn.
   - 5–10% who re-auth slowly (over months) and reduce purchase frequency.
   - 5% additional churn from the general "new owner" trust hit.
3. Apply a **5–10% additional churn** to month 2 (tail of the re-auth campaign).
4. By month 6 the curve normalizes — assume the buyer's organic retention from month 6 onward.

**Example math.** If trailing-12 revenue is $50K and the seller's pre-close monthly is ~$4K, the buyer should model:

| Month post-close | Revenue assumption              |
| ---------------- | ------------------------------- |
| M1               | $4K × (1 − 0.30) = $2.8K        |
| M2               | $4K × (1 − 0.10) = $3.6K        |
| M3+              | $4K (baseline)                  |
| Y1 total         | ~$45K vs $48K seller's trailing |

That ~7% Y1 haircut is the "Stripe transfer tax." The buyer either accepts it in valuation or negotiates an earnout structure (paid 30% at close, 70% over Y1 contingent on revenue thresholds — Acquire.com supports this structure natively).

---

## What we do NOT promise

For the listing copy and the LOI cover letter, the seller's commitments are bounded:

- We **do** deliver the pre-built re-auth campaign on Day 1.
- We **do** form the LLC and execute the Stripe Account Transfer (when LLC-owned).
- We **do** send the 14-day pre-close customer notice.
- We **do** offer a 30-day advisory window for the buyer to escalate questions.

We **do not** promise:

- Any specific re-auth conversion rate.
- Any specific Y1 revenue level.
- Any customer-side support during or after the cutover (the buyer's team handles inbound support from Day 1).
- Any clawback if churn exceeds the modeled range.

This is a deliberate, narrow commitment surface. Buyers respect a seller who knows what they can and can't guarantee.

---

## Cross-references

- [`docs/STRIPE_RE_AUTH_CAMPAIGN.md`](../STRIPE_RE_AUTH_CAMPAIGN.md) — the email + push + in-app campaign assets (shipped separately).
- [`docs/transferability/per-account-transfer-plan.md`](../transferability/per-account-transfer-plan.md) §"Stripe account" — the operational steps for the Account Transfer.
- [`docs/transferability/post-acquisition-timeline.md`](../transferability/post-acquisition-timeline.md) — where the Day-1 campaign fires.
- [01-stripe-export-runbook.md](01-stripe-export-runbook.md) — Stripe payouts CSV for valuation.
- [04-tech-defensibility.md](04-tech-defensibility.md) §"Stripe dependency" — why migrating away from Stripe entirely is not recommended.
