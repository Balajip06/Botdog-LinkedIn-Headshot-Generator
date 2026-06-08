# Stripe Payouts Export — Diligence Runbook

**Last refreshed:** 2026-05-29
**Audience:** seller, preparing a Stripe payouts CSV for buyer review.
**Counterpart for buyer:** the file you send is named `stripe-payouts-<YYYY-MM>.csv`; buyer cross-references it against the Supabase `webhook_events` export.

This is the procedure for pulling Stripe payouts data for a buyer's diligence team. The output is a clean CSV the buyer can drop into a spreadsheet without seeing customer PII.

---

## What buyers ask for

When a buyer says "send me a Stripe export," they usually mean **payouts** (money that landed in your bank), not raw charges. Payouts are aggregated, fee-netted, and the natural unit for revenue diligence. Charges are useful as the join key to our `webhook_events` table.

Send both, in this order:

1. **`stripe-payouts-<YYYY-MM>.csv`** — the headline number (monthly net + gross + fees).
2. **`stripe-charges-<YYYY-MM>.csv`** — the line-item detail, for any buyer who wants to cross-foot.

---

## Stripe Dashboard path — payouts CSV

1. Sign in to https://dashboard.stripe.com.
2. Navigate: **Reports → Payouts** (left sidebar).
3. Filter to the desired date range (e.g. last 3 months, or all-time).
4. Click **Export** in the top right.
5. Choose **CSV**, leave the column set on default ("All available columns").
6. Stripe emails the export to the account owner within ~5 minutes (sometimes instant for small ranges).
7. Save as `stripe-payouts-<YYYY-MM>.csv`.

---

## What fields buyer cares about

The Stripe payouts CSV ships ~20 columns. Most are noise. The four that matter:

| Column         | Description                                                               | Why buyer cares                              |
| -------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| `paid_at`      | Timestamp the payout hit your bank.                                       | Lets buyer build a monthly revenue chart.    |
| `gross_amount` | Sum of charges paid out, before Stripe fees. Decimal in account currency. | The top-line revenue number.                 |
| `fee`          | Stripe's processing fee for the payout.                                   | Buyer subtracts this to get net.             |
| `net_amount`   | `gross_amount − fee`. The actual deposit to your bank.                    | The number that matches your bank statement. |
| `currency`     | Account currency (`usd` for Botdog).                                      | Sanity check — should always be `usd`.       |

**Other columns to keep** in the export but de-emphasize:

- `arrival_date` — when Stripe scheduled the payout (vs `paid_at` which is when it actually landed). Useful if a buyer questions a delay.
- `status` — `paid` for normal, `in_transit` mid-flight, `failed` if it bounced. Filter out `failed` rows or note them separately.

**Columns to drop before sending** (noise):

- `id`, `automatic`, `description`, `method` — internal Stripe metadata. Not useful to buyer. Optional to keep, but they ask "what's this" and you have to explain.

---

## Customer PII in payouts CSV

**Stripe payouts CSV does not include customer emails or names by default.** Payouts are aggregated across many charges and the export only contains the payout-level fields above. This is the "safe" CSV.

If the buyer asks for **per-charge detail** (the `stripe-charges-<YYYY-MM>.csv`), that file _does_ contain customer PII:

- `customer_email`
- `customer_name`
- `billing_details.address`
- `card.last4` + `card.brand`

**Before sharing the charges CSV:**

1. Open in a spreadsheet.
2. Replace `customer_email` with a SHA-256 8-char prefix (consistent with our anonymization elsewhere — see [`docs/data-room/README.md`](../data-room/README.md) §"Encryption").
3. Drop `customer_name`, `billing_details.address`, and `card.last4`.
4. Keep `card.brand` (Visa / MC / Amex) — useful for buyer to verify customer-base mix, no PII.

Or — easier — give the buyer access to **read-only Stripe Dashboard** during diligence and let them export themselves. Stripe supports read-only team-member roles; the buyer signs an NDA, gets read-only for 14 days, and pulls whatever they want. After LOI, revoke access.

---

## Cross-reference with `webhook_events` table

Every successful Stripe `checkout.session.completed` event lands as a row in our `webhook_events` table (see [`docs/adr/0005-idempotency-strategy.md`](../adr/0005-idempotency-strategy.md)). This lets the buyer reconcile Stripe's view against our database's view.

**Mapping:**

| Stripe field           | `webhook_events` field                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Event ID (`evt_...`)   | `event_id` (unique constraint)                                                                   |
| Charge ID (`ch_...`)   | `payload->'data'->'object'->>'id'`                                                               |
| `customer_email` (raw) | `payload->'data'->'object'->'customer_details'->>'email'` (redacted in admin export — see below) |
| `amount_total` (cents) | `payload->'data'->'object'->>'amount_total'`                                                     |
| `created` (epoch)      | `created_at` (Postgres timestamptz)                                                              |

**The reconciliation:**

- Pull Stripe payouts → sum `gross_amount` for the month.
- Pull `webhook_events` → sum `amount_total / 100` for `source = 'stripe'` and `type = 'checkout.session.completed'` for the same month.
- The two numbers should match within ~$5 (rounding + payouts excluding the most recent ~2 days of charges).
- Anything > 2% delta means a webhook was dropped or a duplicate charge was processed. Investigate before sending to buyer.

---

## Refund-rate calculation

Buyers always ask for refund rate. Trailing 90 days is the standard window. (Botdog ships a single headshot style trend today, so per-trend drill-down below is a no-op until more styles ship.)

### From Stripe Dashboard

1. **Reports → Refunds** (or use the Sigma query below).
2. Filter to trailing 90 days.
3. Note the count of refunded transactions.
4. Divide by total charged transactions in the same window (from **Reports → Charges**).

### From our database

```sql
WITH window_charges AS (
  SELECT count(*) AS n
  FROM webhook_events
  WHERE source = 'stripe'
    AND type = 'checkout.session.completed'
    AND created_at >= now() - interval '90 days'
),
window_refunds AS (
  SELECT count(*) AS n
  FROM webhook_events
  WHERE source = 'stripe'
    AND type = 'charge.refunded'
    AND created_at >= now() - interval '90 days'
)
SELECT
  window_refunds.n AS refunded_count,
  window_charges.n AS charged_count,
  round(100.0 * window_refunds.n / nullif(window_charges.n, 0), 2) AS refund_rate_pct
FROM window_refunds, window_charges;
```

**Acceptable refund rate** for a consumer image-gen product: < 5% is healthy, 5–10% is normal, > 10% is a yellow flag (usually a quality issue with the headshot output — drill into per-style refund rate if more styles ship).

---

## Sample SQL — weekly gross revenue from `webhook_events`

```sql
SELECT
  date_trunc('week', created_at) AS wk,
  count(*) AS checkout_count,
  sum((payload->'data'->'object'->>'amount_total')::int) / 100.0 AS gross_usd
FROM webhook_events
WHERE source = 'stripe'
  AND type = 'checkout.session.completed'
GROUP BY 1
ORDER BY 1;
```

The output is the same shape the admin `/admin/margin` dashboard ingests — see [02-mock-vs-real-explainer.md](02-mock-vs-real-explainer.md) for how the dashboard's numbers reconcile to this query.

---

## Sensitive data handling — admin export route

When the buyer asks for "the full webhook_events export," we ship it via [`app/admin/export/download/route.ts`](../../app/admin/export/download/route.ts) — the same route the data-room uses. That route already calls `redactPayloadEmails()` (defined in the same file) which:

- Replaces every `email` field in the `payload->data->object` tree with a SHA-256 8-char prefix.
- Leaves the rest of the payload intact (amount, currency, product metadata).
- Logs the export to `admin_audit_log` so we have a record of who got what.

**This means:** the CSV the buyer receives from `/admin/export/download` is already PII-safe and can be shared without further redaction. The raw `customer_email` field never leaves our admin route.

---

## Checklist before sending to buyer

- [ ] Date range filtered correctly (default: trailing 90 days; full range only on LOI+).
- [ ] PII columns dropped or hashed (`customer_email`, `customer_name`, address, `card.last4`).
- [ ] Filename has a clear date stamp (`stripe-payouts-2026-05.csv`).
- [ ] Cross-foot against `webhook_events` query above — delta < 2%.
- [ ] If delta > 2%, investigate before sending. Common cause: dropped webhook event (see [`docs/sops/incident_response.md`](../sops/incident_response.md)).
- [ ] Sharing via Drive link with explicit-share-only (no public link).

---

## Cross-references

- [`docs/adr/0005-idempotency-strategy.md`](../adr/0005-idempotency-strategy.md) — why `webhook_events` exists.
- [`docs/data-room/01-financial/`](../data-room/README.md#01-financial--revenue-costs-unit-economics) — where the canonical CSVs live.
- [02-mock-vs-real-explainer.md](02-mock-vs-real-explainer.md) — the dashboard-vs-Stripe reconciliation contract.
- [`docs/sops/refund_request.md`](../sops/refund_request.md) — the SOP for processing a single refund.
- [`app/admin/export/download/route.ts`](../../app/admin/export/download/route.ts) — the redacting admin export endpoint.
