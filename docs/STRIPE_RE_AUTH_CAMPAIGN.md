# Stripe Re-Auth Campaign — Post-Acquisition Playbook

> W14 post-close mitigation referenced in the plan's risk register. Buyer fires
> this on Day 1 of new ownership. Drafts live here so the buyer doesn't have to
> write transition copy under time pressure.

## Why this exists

When Botdog is sold, customer payment methods don't transfer between Stripe
accounts. Stripe holds PCI-scoped card data tied to the merchant account that
originally collected it — handing those tokens to a new account is not legal or
operationally possible. Every existing paying customer must re-enter their card
on the new account before they can buy another credit pack. The industry
baseline for this transition is **30–60% churn**. The goal of this campaign is
to land below that floor by making the re-auth path one click, warm, and
explained.

## Campaign cadence

| Day | Step          | Channel | Discount           | Goal                                      |
| --- | ------------- | ------- | ------------------ | ----------------------------------------- |
| D0  | Announce      | Email   | none               | Transparent heads-up, single CTA          |
| D3  | Reminder      | Email   | 20% off next pack  | Add a small carrot for the on-the-fencers |
| D7  | Last call     | Email   | 30% off next pack  | Bigger carrot for the wait-and-seers      |
| D14 | Final notice  | Email   | 30% + manual offer | Personal-touch reach-out for high-LTV     |
| D28 | Mark inactive | CRM     | n/a                | Stop emailing, move to "lapsed" segment   |

Discount codes (`TRANSITION20`, `TRANSITION30`) are one-time-use per customer,
expire D60, and apply only to credit packs (no recurring product on Botdog).

---

## Email templates

All emails:

- From: the buyer's voice (signed by the new owner), not "Team Botdog"
- Plain-text-first; HTML version optional
- Single primary CTA button (re-auth link)
- Preserve UTM convention: `?utm_source=re_auth&utm_medium=email&utm_campaign=stripe_migration&utm_content=d{0,3,7,14}`

### D0 — Announce

**Subject:** A quick heads-up about Botdog

**Preheader:** New owner, same product, one small ask.

**Body:**

> Hey {{first_name}},
>
> I'm {{new_owner_name}}, the new owner of Botdog. As of {{close_date}}, I've
> taken over the product — same headshot styles, same generation flow, same team
> behind the AI.
>
> One quick housekeeping note: we've moved to new payment infrastructure. For
> security reasons, Stripe doesn't let us transfer saved cards between
> accounts. **Your generation history and credit balance are preserved** —
> but the next time you want to buy a credit pack, you'll be asked to enter
> your card once.
>
> When you're ready:
>
> [Re-enter card and keep generating →]({{re_auth_url}})
>
> Nothing to do today if you're not buying. We just wanted you to hear it from
> us before you saw a new charge descriptor.
>
> Thanks for being one of our early customers.
>
> — {{new_owner_name}}

---

### D3 — Reminder + 20% off

**Subject:** Still here for you — and 20% off your next pack

**Preheader:** A small thank-you for sticking around through the transition.

**Body:**

> Hey {{first_name}},
>
> Quick follow-up on the ownership transition. Some folks have already
> re-authed and picked up where they left off — others are still on the fence,
> which is fair.
>
> If you're in the second group, here's a small thank-you for sticking with us:
> **20% off your next credit pack** with code `TRANSITION20` at checkout.
>
> [Re-enter card and apply 20% off →]({{re_auth_url}}&promo=TRANSITION20)
>
> Reminder: your old credit balance and generation history are still in your
> account. Nothing was reset. Only the card-on-file needs to be re-entered.
>
> — {{new_owner_name}}

---

### D7 — Last call + 30% off

**Subject:** Last call: 30% off, then we'll stop nagging

**Preheader:** Final discount on the transition. After this, regular pricing.

**Body:**

> Hey {{first_name}},
>
> One more bump on the re-auth, then I'll stop landing in your inbox about it.
>
> The discount steps up to **30% off your next credit pack** for the next 7
> days with code `TRANSITION30`. After that, we go back to standard pricing —
> no more "transition" promos.
>
> [Claim 30% off and re-auth →]({{re_auth_url}}&promo=TRANSITION30)
>
> If you've decided Botdog isn't for you anymore, that's totally fine and I
> won't follow up. Just wanted to make sure the discount actually reached you
> while it's still available.
>
> — {{new_owner_name}}

---

### D14 — Final notice + manual outreach offer

**Subject:** Reaching out personally

**Preheader:** If the timing's wrong, just reply — I'll handle it.

**Body:**

> Hey {{first_name}},
>
> Last note from me on the transition. The 30% transition discount is still
> live for a few more days (`TRANSITION30`), but I wanted to send this one as a
> real person, not just a campaign.
>
> If the timing is off — busy quarter, on vacation, account belongs to someone
> who left the team, whatever — **just reply to this email and I'll handle it
> manually**. Extend the discount, transfer credits to a new account, refund
> what's unused, whatever makes sense for you.
>
> [Re-auth at 30% off →]({{re_auth_url}}&promo=TRANSITION30)
>
> Either way, thanks for being part of the early Botdog run. It mattered.
>
> — {{new_owner_name}}
> {{new_owner_email}}

---

### D28 — (internal — no email sent)

Move customer to CRM segment `lapsed_post_acquisition`. Stop active campaigns.
Eligible for re-engagement at D90+ via a separate "we miss you" pulse, gated by
their original engagement decile.

---

## Tracking

Append this to every CTA link in the campaign:

```
?utm_source=re_auth&utm_medium=email&utm_campaign=stripe_migration&utm_content=d{N}
```

Where `{N}` is `0`, `3`, `7`, or `14` matching the cadence step. PostHog
captures `utm_*` automatically on the page-view event; build a funnel from
`re_auth_email_clicked → checkout_started → checkout_completed`, split by
`utm_content` to see which cadence step actually converts.

## Success metric

**Primary:** % of pre-acquisition paying customers who re-auth by D28.

- **Target:** ≥ 40% (beats the industry 30–60% churn floor — i.e. < 60% lapse)
- **Stretch:** ≥ 55% (would imply the transition didn't materially damage LTV)
- **Floor (intervene):** < 30% by D14 → escalate; consider a personal call
  cadence for top-decile customers and double the D14–D28 discount window.

**Secondary:**

- Click-through rate per cadence step (expect D0 > D7 > D3 ≈ D14)
- Reply rate on D14 (manual-outreach signal — high reply rate → buyer should
  spend a week personally on inbox)
- Net revenue retention at D60 vs. pre-close baseline

---

## Resend Audience setup steps

The buyer's new Stripe account contains the post-acquisition customer list with
clear email addresses (the Botdog app exports emails through a hashing step
at `app/admin/export/download` — that path is for GDPR/portability, not
campaign sourcing). Use Stripe's own customer export to seed the audience.

1. **Export from Stripe (new account).** Dashboard → Customers → filter
   `Imported from Botdog migration` (the buyer applies this tag during the
   merchant-of-record handoff) → Export to CSV. Confirm columns: `email`,
   `name`, `description`, `created`. Drop any row without an email.

2. **Create Resend audience.** Resend dashboard → Audiences → New Audience →
   name it `botdog-transition-d0`. Generate the audience ID; store it in the
   buyer's secret manager as `RESEND_AUDIENCE_TRANSITION_ID`.

3. **Bulk import contacts.** Resend → Audience → Add contacts → CSV upload.
   Map `email` → email, `name` → first_name (split on the first space if
   needed). After import, verify the contact count matches the Stripe export
   row count within ±2 (Resend drops invalid-format emails silently).

4. **Schedule the broadcast cadence.** Resend → Broadcasts → New → select the
   audience → paste each template (D0, D3, D7, D14) as a separate broadcast,
   schedule at the cadence dates relative to `{{close_date}} 09:00 customer
local time` (use Resend's per-recipient timezone field if available, else
   fall back to 09:00 UTC). Confirm UTM parameters are embedded in every CTA
   before sending the test.

---

## Owner handoff checklist

Before the buyer fires D0:

- [ ] `{{new_owner_name}}`, `{{close_date}}`, `{{new_owner_email}}` filled in
- [ ] `{{re_auth_url}}` resolves to a Stripe Customer Portal session (or fresh
      Checkout if the customer has no existing subscription) on the new account
- [ ] `TRANSITION20` and `TRANSITION30` promo codes exist in Stripe with
      D60 expiry, single-use per customer, credit-pack price-IDs only
- [ ] Resend audience `botdog-transition-d0` populated and verified
- [ ] PostHog funnel `re_auth_email_clicked → checkout_completed` saved with
      `utm_campaign=stripe_migration` filter
- [ ] D28 CRM rule active: move non-re-authed customers to `lapsed_post_acquisition`
