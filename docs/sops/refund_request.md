# Refund Request SOP

**Last updated:** 2026-05-29
**Trigger:** Customer emails `support@<domain>` requesting a refund, or complains about a failed/bad generation.
**Target response time:** Same business day (within 24h hard cap).
**Tool:** `/admin/refunds` (existing UI at `app/admin/refunds/page.tsx`) + Stripe Dashboard for billing-side refunds.

This SOP turns an inbound support email into either (a) a credit grant via `/admin/refunds`, (b) a Stripe refund + credit grant, or (c) a polite denial with reasoning. Every outcome ends with an audit trail entry and a templated reply.

---

## Decision matrix

Decide which bucket the request falls into **before** opening Supabase. The right reply differs per bucket.

| Customer claim                                     | Bucket                | Action                                                                                                                                                                                                   |
| -------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Gemini rejected my photo / safety filter"         | Auto-refunded already | Verify in `generations`. Reply confirming. No manual action needed.                                                                                                                                      |
| "Generation looks bad / not like me / wrong style" | Quality complaint     | **Denied** per TOS §7 (AI-quality disclaimer). Polite reply, offer one-time goodwill credit if customer is regular.                                                                                      |
| "I bought credits by mistake / never used them"    | Buyer's remorse       | **Full refund** if within 7 days and `credits_balance >= credits_purchased` (i.e. they haven't spent any). TOS §8.                                                                                       |
| "I bought credits, used some, want partial refund" | Mixed                 | **Credits-only refund** for the unused portion. Stripe refund only if you decide to be generous (logged).                                                                                                |
| "Charged twice / duplicate purchase"               | Billing bug           | **Full Stripe refund** of the duplicate + verify the dedup logic (`webhook_events.event_id` UNIQUE — should have caught this). Credits do not need adjustment since the dedup prevents the second grant. |
| "Charge I don't recognize / fraud"                 | Chargeback risk       | Respond immediately. Refund preemptively if claim looks legitimate. Suspend account if you suspect compromised card on our side.                                                                         |
| "Subscription / monthly charge" (we have neither)  | Misdirected           | Polite reply: "We only sell one-time credit packs. Are you sure the charge is from Botdog?" Ask for the last 4 of the card + date.                                                                      |

---

## Step 1 — Identify the customer

Open the Supabase SQL editor (or `psql` if you've wired it locally). Look up the profile:

```sql
select id, email, credits_balance, free_used_this_week, created_at, deleted_at
  from public.profiles
 where email = '<customer_email>';
```

**Record:**

- `user_id` (the UUID — you'll need it for step 2)
- `credits_balance` (so you know how many they still have)
- `deleted_at` (if non-null, they've requested account deletion — see "When NOT to refund")

If no row comes back, the customer probably bought as a guest checkout (Stripe collected their email but auth didn't fire). Check Stripe Dashboard for the charge, refund in Stripe directly, and reply explaining no account was created.

---

## Step 2 — Pull their recent generations

```sql
select id, status, cost_usd, created_at, trend_id, error_message
  from public.generations
 where user_id = '<user_id>'
 order by created_at desc
 limit 20;
```

**What to look for:**

- `status = 'failed'` rows — quota should already be refunded (`refund_quota_on_failure` trigger in migration `20260527000003_generations.sql`). Confirm by re-querying `profiles.credits_balance` / `free_used_this_week`.
- `status = 'completed'` rows the customer is complaining about — these are quality complaints. See decision matrix.
- `status = 'failed_retryable'` rows older than a few hours — these may have stalled. Manual refund warranted.

If the customer named a specific generation by URL (`/result/<id>`), pull that row directly:

```sql
select id, user_id, status, cost_usd, error_message, created_at, output_image_url
  from public.generations
 where id = '<generation_id>';
```

Confirm `user_id` matches the email lookup — if not, the customer is referencing someone else's generation. Ask politely for clarification.

---

## Step 3 — Issue the credit refund

This is the common case: safety-rejected generation, stalled generation, or goodwill credit.

1. Open `/admin/refunds`.
2. Enter the customer's email (same one you looked up).
3. Enter the credit amount. Rule of thumb:
   - 1 credit per failed `completed`-status generation the customer disputes.
   - 5-10 credits for a goodwill gesture on a quality complaint (only if the customer is a repeat purchaser).
   - Full pack credits (50/200/600 per `lib/payments/packs.ts`) for a buyer's-remorse refund.
4. Reason field — **factual + grep-able**, this gets written to `admin_audit_log.after.source_ref` via the `grant_credits` SECURITY DEFINER function in `supabase/migrations/20260528000001_grant_credits.sql`. Good reasons:
   - `refund — safety reject on gen abc123`
   - `refund — duplicate purchase, stripe_pi_xxx refunded`
   - `goodwill — quality complaint, regular customer`

   Bad reasons (avoid — these become noise in audit queries):
   - `refund`
   - `customer asked`
   - `see email`

5. Submit. The page redirects with `?issued=<n> credits to <email>` on success or `?error=<msg>` on failure.

**Verification:** the form action `issueRefund` in `app/admin/refunds/actions.ts` calls `grantCredits` which executes `grant_credits(user_id, amount, source='support', source_ref=<reason>)`. That function (a) increments `profiles.credits_balance`, (b) writes an `admin_audit_log` row with `action='credit_grant'`, `target_table='profiles'`, `after={amount, source: 'support', source_ref}`. All in one transaction.

---

## Step 4 — Issue a Stripe refund (when applicable)

Skip this step if you're only granting credits as compensation. Do this step when the customer was billed in error or when the decision matrix says "full Stripe refund."

1. Open [https://dashboard.stripe.com/payments](https://dashboard.stripe.com/payments).
2. Filter by customer email or last-4 of card.
3. Find the charge. Click into it.
4. Click **Refund payment** → choose full or partial amount → reason: pick the closest Stripe-canonical reason (usually "Requested by customer").
5. Stripe will fire a `charge.refunded` webhook. Our webhook handler (`app/api/stripe/webhook/route.ts`) is idempotent via `webhook_events.event_id` UNIQUE — it logs the event but does **not** auto-debit credits the customer already received. That's deliberate: if you wanted to claw back credits, you must do it manually via SQL.

If the customer had **already spent** the credits from the refunded purchase, you have a decision: either eat the cost (the typical answer for first-time customer service issues) or claw back the credits via:

```sql
-- Only do this with the customer's knowledge — clawing back silently is a TOS issue.
update public.profiles
   set credits_balance = greatest(credits_balance - <n>, 0)
 where id = '<user_id>';
-- Then manually insert the audit row:
insert into public.admin_audit_log (admin_id, action, target_table, target_id, after)
values (
  auth.uid(),
  'credit_clawback',
  'profiles',
  '<user_id>',
  jsonb_build_object('amount', <n>, 'reason', 'stripe refund issued, credits clawed back', 'stripe_charge_id', '<ch_xxx>')
);
```

---

## Step 5 — Reply to the customer

Reply within 24h of the original email. Templates below — keep the tone friendly, factual, brief.

The audit-log row from step 3 is your proof of action. The reply is your customer-facing proof.

---

## Step 6 — Verify the audit trail

Open `/admin/audit` (`app/admin/audit/page.tsx`). Filter to the last hour. You should see:

- One row with `action='credit_grant'`, `after.source='support'`, `target_id=<user_id>` for each credit grant you issued.
- Zero rows you did not personally trigger (anything else is a bug or another admin — flag it).

If the row is missing, the SECURITY DEFINER function failed silently. Check `pg_stat_statements` or the Supabase logs. Re-run the grant if necessary.

---

## When NOT to refund

The following patterns are abuse and warrant a denial. Document the denial in your support folder (a plain notes file is fine pre-acquisition).

- **Repeat refund requests from the same fingerprint / IP / email.** Cross-reference `anonymous_attempts.fingerprint_hash` + `ip_hash` (see migration `20260527000004_ancillary.sql`). If the customer has issued > 2 refund requests in 30 days, flag the account and stop honoring refunds without supervisor (= you) review.
- **Refund request after sharing the generation publicly.** Watermarked output indicates virality — the customer got value. Quality complaint after share is bad faith.
- **Refund request for a generation > 30 days old.** Stripe disputes are bounded at ~120 days but our internal refund policy is 7 days per TOS §8. Politely decline.
- **Chargeback-then-refund.** If the customer already filed a chargeback with their bank, do **not** also issue a Stripe refund — Stripe will charge you twice. Respond to the chargeback with evidence (`admin_audit_log` + generation history) and let Stripe arbitrate.
- **"I didn't authorize this" but our records show the account is in active use.** Likely an account-sharing dispute or shared card. Ask clarifying questions; do not refund preemptively.

Rate-limit + fingerprint dedup is already in place at `/api/generate` (Edge rate-limit middleware) and `/api/generate-anonymous` (the `anonymous_attempts.UNIQUE (fingerprint_hash, ip_hash)` constraint). The dedup is what protects you from infinite-free-trial abuse; your job is to ensure refund decisions don't undermine it.

---

## Templated replies

Replace `<>` placeholders before sending. Keep paragraphs short.

### Template A — Safety-reject auto-refund confirmation

```
Subject: Re: refund — your Botdog generation

Hi <name>,

Thanks for reaching out. I checked your account and the generation from <date> hit our model's safety filter, which means your credit was automatically refunded back to your balance. You should see <n> credits available right now.

If the photo was something you expected to work, please reply with a quick description — we adjust prompts when a trend's safety rate drops, and your feedback helps.

— Botdog
```

### Template B — Quality complaint, denied with goodwill credit

```
Subject: Re: refund — quality on trend "<trend_title>"

Hi <name>,

Thanks for the feedback. AI image generation is non-deterministic — sometimes the same prompt produces a result that doesn't match the input photo well. Our Terms (§7) cover this, so I can't refund the credit on quality grounds.

That said, you've been a great customer, so I've added <n> goodwill credits to your account. Please give the trend another try — sometimes a slightly different photo angle changes the output significantly.

— Botdog
```

### Template C — Buyer's remorse, full pack refund

```
Subject: Re: refund — credit pack purchase

Hi <name>,

No problem. I've refunded your credit pack purchase from <date> in full (<$amount>). The refund will land on your card in 5-10 business days, depending on your bank.

Your account will keep the credits you've already used; the unused balance has been cleared.

If you change your mind, you can re-purchase any time from the Settings page.

— Botdog
```

### Template D — Denial for abuse pattern

```
Subject: Re: refund request

Hi <name>,

I've reviewed your account history and I'm not able to issue another refund. Our policy allows refunds within 7 days for unused credits, and goodwill credits are issued at our discretion — both of which have been applied to your account previously.

If you have a specific bug to report (a generation that returned a clearly broken image, a failed payment, etc.), please share details and I'll take another look.

— Botdog
```

---

## Audit checklist (close the loop)

Before closing the ticket:

- [ ] `admin_audit_log` row exists for the grant (verify via `/admin/audit`).
- [ ] Customer received the reply (check sent folder).
- [ ] Stripe refund (if applicable) shows status `succeeded` in Stripe Dashboard.
- [ ] Customer's `credits_balance` reflects the grant.
- [ ] Note the case in your support tracking (notes file or whatever you use).

If you skip any of these, the next monthly accounting reconciliation will surface the gap.
