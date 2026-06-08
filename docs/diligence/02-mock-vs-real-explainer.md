# Dashboards: Mock vs Real Data Explainer

**Last refreshed:** 2026-05-29
**Audience:** seller (you), preparing for the buyer question "are these dashboard numbers real?"
**Short answer:** real revenue rows always win; the mock fallback only kicks in when the database returns zero rows (pre-launch / dev / a brand-new buyer's test env).

This one-pager exists because Botdog's admin dashboards (`/admin`, `/admin/margin`, `/admin/users`, `/admin/referrals`) have a deterministic mock fallback in [`lib/analytics/margin.ts`](../../lib/analytics/margin.ts). Buyers should know exactly when they're looking at real numbers and when they're looking at synthetic shape data.

---

## Why a mock fallback exists

When the production database has **zero `generations` rows + zero `webhook_events` rows for the current week** (i.e. brand-new install, dev environment, or pre-launch state), the dashboard tile would render as an empty card with `$0.00` and a flat line. That's:

- A bad UX for the admin (you can't tell if the dashboard is broken or just empty).
- Worse for a buyer doing diligence on a fresh handover — empty dashboards look like a broken handover, not an empty database.

So `lib/analytics/margin.ts` ships a deterministic mock series (~150 lines of synthetic shape data — a stable revenue curve, a stable margin %, a stable per-trend breakdown). When real data exists, real data is returned; when no real data exists, mock is returned with `isMock: true` on the return object.

**This is a UX fallback, not a deception vector.** The data layer is honest about which mode it's in.

---

## How to tell real vs mock

Every analytics function in [`lib/analytics/margin.ts`](../../lib/analytics/margin.ts) returns an `isMock: boolean` flag on its result object. The flag propagates up to the admin pages.

The user-visible markers:

| Surface                                               | Where the `isMock` signal lives                                                                                                                           | What buyer sees                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `/admin/margin`                                       | [`app/admin/margin/page.tsx`](../../app/admin/margin/page.tsx) renders a "Demo data" badge in the header when `margin.isMock === true`                    | Yellow `Demo data` pill next to the page title        |
| `/admin/margin` "Demo data" toggle                    | The page also exposes a `?mock=1` query param via the `DataSourceToggle` component to **force** mock — explicit, opt-in, for screenshot/parallel-run work | A second yellow banner "Demo data forced via ?mock=1" |
| `/admin/users`, `/admin/referrals`, `/admin` overview | Same pattern: each page reads `isMock` from its analytics source and renders a badge near the relevant tile                                               | Yellow badge or muted "demo" label on affected tiles  |

**Buyer-facing rule:** if a yellow "Demo data" / "Mock" badge is visible, the numbers on that page are synthetic. No badge = real data straight from the database.

The shared [`components/admin/KpiCard.tsx`](../../components/admin/KpiCard.tsx) tile itself does **not** carry the `isMock` flag — the badge is rendered at the page level (next to the page title, not inside each card). This is intentional: when even one tile on a page falls back to mock, the entire page is flagged as demo data, not per-tile.

**For pure read-only buyer access**, a recommended pre-share toggle is: log into `/admin/margin?mock=0` (the default) and confirm no yellow badges anywhere. If a badge is visible, the database is empty for that range — wait for real data to accrue, or hand buyer the raw Stripe export instead (see [01-stripe-export-runbook.md](01-stripe-export-runbook.md)).

---

## Parallel-run period

Between W2 (launch) and W6 (4 weeks post-launch), there is a "parallel-run" window during which:

- Real `webhook_events` rows are accruing.
- The mock fallback is still wired in for any week that has < 5 rows.
- The seller monitors `/admin/margin` against the Stripe Dashboard daily to confirm the two views match.

During this window, **do not show the dashboard externally**. Use the raw Stripe payouts CSV (see [01-stripe-export-runbook.md](01-stripe-export-runbook.md)) for any buyer who asks for numbers.

After W6, the dashboard is locked to real data for all weeks with revenue activity. The mock fallback only kicks in for weeks with literally zero rows — at that point the dashboard is safe to show externally.

---

## Reconciliation method

To prove "the dashboard is real," cross-foot three sources for the same date range:

1. **Stripe Dashboard → Reports → Payouts** → sum `gross_amount`.
2. **Supabase `webhook_events` query** (see [01-stripe-export-runbook.md](01-stripe-export-runbook.md) §Sample SQL) → sum `amount_total / 100`.
3. **`/admin/margin` dashboard** → "Revenue (gross)" tile for the same range.

All three should produce the same number within rounding.

**Why they can differ slightly:**

- Stripe payouts exclude transactions from the most recent ~2 business days (Stripe's payout schedule).
- Refunds processed after the date range close but for charges inside it cause Stripe payouts to lag the `webhook_events` view.
- Currency rounding: Stripe stores in cents, dashboard sometimes displays in dollars with `.toFixed(2)`.

---

## Acceptable delta

| Delta between Stripe & dashboard | Interpretation                                                                     | Action                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| < 2%                             | Normal rounding + timing                                                           | None — safe to show buyer                                                                                      |
| 2–5%                             | Yellow flag — payout-schedule lag or refund timing                                 | Note it in the buyer comment; check next week                                                                  |
| > 5%                             | Red flag — likely a bug (dropped webhook, duplicate charge, refund not propagated) | **Stop.** Do not show buyer. Investigate. See [`docs/sops/incident_response.md`](../sops/incident_response.md) |

A > 5% delta on a live production dashboard is a sev-2 incident. Pull the webhook delivery log from Stripe Dashboard → Developers → Webhooks → your endpoint → "Events," find any `failed` deliveries, replay them, then re-run the reconciliation.

---

## Buyer-facing assertion (copy/paste)

For the Acquire.com listing description, the LOI cover letter, or the buyer's first diligence email:

> Dashboards switched to real-data mode on **YYYY-MM-DD** (launch + 6 weeks). Mock-data fallback is retained in the codebase for dev / test environments where the database has zero rows — when active, the dashboard renders a visible "Demo data" badge in the header. Real-vs-mock reconciliation against Stripe Dashboard runs daily; trailing 90-day delta is within 2%. Source: [`docs/diligence/02-mock-vs-real-explainer.md`](docs/diligence/02-mock-vs-real-explainer.md).

Fill in the date as YYYY-MM-DD when the W6 milestone is reached and verified.

---

## What to do if a buyer screenshot shows the badge

If a buyer sends a screenshot of the admin dashboard with the yellow "Demo data" badge visible, **respond immediately** before they move on:

> "Good catch — that badge means the dashboard fell back to demo data for that range (the database has zero rows in the window you queried). The fallback is documented in [`docs/diligence/02-mock-vs-real-explainer.md`](docs/diligence/02-mock-vs-real-explainer.md) §How to tell real vs mock. For real numbers in that range, please use the Stripe payouts export at [`docs/data-room/01-financial/revenue-by-month.csv`](docs/data-room/01-financial/revenue-by-month.csv) — or change the range to one where transactions exist."

That response shows the seller is calmly accountable, the design is intentional, and the data exists elsewhere. It does not look like the seller is hiding anything.

---

## Cross-references

- [`lib/analytics/margin.ts`](../../lib/analytics/margin.ts) — the analytics source with `isMock` flag.
- [`app/admin/margin/page.tsx`](../../app/admin/margin/page.tsx) — where the badge renders.
- [`components/admin/KpiCard.tsx`](../../components/admin/KpiCard.tsx) — the shared tile (does not carry the flag — flag is at page level).
- [01-stripe-export-runbook.md](01-stripe-export-runbook.md) — how to pull the Stripe-side source of truth.
- [`docs/sops/incident_response.md`](../sops/incident_response.md) — what to do if reconciliation delta > 5%.
- [`docs/data-room/01-financial/`](../data-room/README.md#01-financial--revenue-costs-unit-economics) — canonical revenue CSV exports.
