# Daily Ops SOP

**Last updated:** 2026-05-29
**Owner:** Operator (you, while solo)
**Time budget:** 5 min/day, 30 min/Sunday, 1 hr/month

This is the operational heartbeat for Botdog. The morning check is the only daily ritual that matters — everything else escalates from there. Keep `/admin` open in a tab while you drink coffee.

---

## Morning check (5 min)

Run these in order. The first one to surface a problem is the only one that matters for the rest of the morning.

- **Open `/admin`.** Confirm the dashboard renders. If you get a 500 here, that is incident-zero — jump to the Sentry escalation row before anything else.
- **Scan WAU / DAU sparkline.** Look for a step-change down vs. trailing 7 days. A single sub-trend dip is noise; a flat-line across all surfaces means the homepage or auth is broken. If unsure, open `/` in an incognito tab and try a logged-out signup.
- **Check Sentry error count.** Open [https://sentry.io/organizations/`SENTRY_ORG`/issues/](https://sentry.io/) (link wired in W6). The number you care about: new issues in the last 24h. If > 3 new issues with `level=error`, triage immediately — see "Triggers to escalate" below.
- **Check Stripe payouts.** Open [https://dashboard.stripe.com/payouts](https://dashboard.stripe.com/payouts). You want to see a "scheduled" payout queued for the next 2-3 business days. If you see "failed" or "on hold" — Stripe owes you a reason, and you owe customers a response.
- **Check refund queue (`/admin/refunds`).** No queue page exists yet; this is the manual refund form. What you are actually checking: your inbox for the `support@` address. Any refund request from last night gets a response today, even if the response is "I'm looking into it."
- **Check `trend_suggestions` inbox (`/admin/suggestions`).** Look for `status='pending'` rows from the (post-MVP) auto-proposer or user submissions. Approve / reject in the same session — a stale inbox decays into nothing.

If all five are green, you are done. Close the tab and write code.

---

## Weekly check (Sunday, 30 min)

Sunday because the free-tier weekly quota reset (`pg_cron job reset_free_weekly` at 00:00 UTC Sunday — see `supabase/migrations/20260527000005_pg_cron.sql`) gives you a clean week boundary to measure against.

### Trailing-7 revenue

```sql
-- Sum completed credit-pack purchases over the last 7 days.
-- Replace 'stripe' if you ever add a second payment source.
select
  count(*)                                            as purchase_count,
  sum((payload -> 'data' -> 'object' ->> 'amount_total')::int) / 100.0
                                                      as revenue_usd
from public.webhook_events
where source = 'stripe'
  and processed_at >= now() - interval '7 days'
  and payload ->> 'type' = 'checkout.session.completed';
```

Plot this against last week. Down > 30% week-over-week with no obvious cause (holiday, ad campaign ended, etc.) means investigate.

### Refund rate

```sql
-- Refunds issued via /admin/refunds in the last 7 days, divided by purchases.
select
  count(*) filter (where action = 'credit_grant' and after ->> 'source' = 'support')
    as refunds,
  count(*) filter (where action = 'credit_grant' and after ->> 'source' = 'stripe')
    as purchases
from public.admin_audit_log
where created_at >= now() - interval '7 days';
```

Healthy refund rate is < 5%. > 10% means a quality regression or a confused pricing surface. > 15% triggers escalation (see below).

### Repeat-purchase rate

```sql
-- Of users who purchased last week, how many had purchased before?
with last_week_purchasers as (
  select distinct target_id
  from public.admin_audit_log
  where action = 'credit_grant'
    and after ->> 'source' = 'stripe'
    and created_at >= now() - interval '7 days'
)
select
  count(*) filter (where prior_purchases > 0) as repeat_purchasers,
  count(*)                                    as total_purchasers,
  round(100.0 * count(*) filter (where prior_purchases > 0) / nullif(count(*), 0), 1)
                                              as repeat_pct
from (
  select
    p.target_id,
    (select count(*) from public.admin_audit_log a2
       where a2.target_id = p.target_id
         and a2.action = 'credit_grant'
         and a2.after ->> 'source' = 'stripe'
         and a2.created_at < now() - interval '7 days') as prior_purchases
  from last_week_purchasers p
) s;
```

For a credit-pack consumer SaaS, 30%+ repeat is excellent, 15-30% is healthy, < 15% means people churn after their first pack. This is the single most important LTV proxy you have pre-subscription.

### Cohort retention dashboard

Open `/admin` → cohort retention card (added W3). Look at the 7d / 30d retention curves for the trailing 4 cohorts. Flat or rising = healthy. Each cohort below the previous = product decay; pick a trend that retired and replace it.

---

## Monthly check (1st of month, 1 hr)

### Stripe payouts CSV for accounting

1. Open [https://dashboard.stripe.com/payouts](https://dashboard.stripe.com/payouts).
2. Filter to last month, click **Export** → CSV.
3. Drop into `~/Documents/botdog-accounting/YYYY-MM-payouts.csv`. Forward to whoever does your books.

### Archive the 12-month financial model

The financial model lives in `docs/financial-model/` (created W4 of this plan). On the 1st of every month:

- Snapshot the current model: `cp docs/financial-model/current.xlsx docs/financial-model/archive/YYYY-MM.xlsx`.
- Update the trailing-12-month MRR / revenue / expense numbers in `current.xlsx` from the Stripe CSV.
- Recompute LTV / CAC if you ran any paid ads.

### Trend velocity review

```sql
-- How many trends shipped vs retired last month?
select
  count(*) filter (where is_active = true and created_at >= now() - interval '30 days')
    as shipped_last_30d,
  count(*) filter (where is_active = false and updated_at >= now() - interval '30 days'
                   and created_at < now() - interval '30 days')
    as retired_last_30d,
  count(*) filter (where is_active = true) as currently_active
from public.trends;
```

Target: 2-4 new trends per month, retire whatever has < 1% of weekly generations. A flat trend catalog is a sign you have stopped operating the product.

### Trademark renewal check

Open your domain registrar + trademark filings (if any). USPTO trademark renewal windows are at the 5-year and 10-year marks — set a calendar reminder for 60 days before. Domain registrations should be on auto-renew with a real card.

---

## Triggers to escalate

| Trigger                                                       | SOP to follow                                                                                                                                                                                                                                                                                                                                                     | Who to notify                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Sentry error rate > 2% of requests in the last 1h             | Open Sentry → group by `transaction` → top 1 issue → triage. If it touches `/api/generate`, `/api/stripe/webhook`, or auth — declare an incident in your head, fix before anything else.                                                                                                                                                                          | Self (solo); post-acquisition: buyer's on-call                                              |
| Refund rate > 15% trailing-7                                  | `docs/sops/refund_request.md` (every individual case) + investigate the root cause: bad trend? broken Gemini key? sudden Pro tier confusion?                                                                                                                                                                                                                      | Self; if it persists 7+ days, pull the offending trend                                      |
| Daily Gemini spend > $20                                      | Open Google Cloud Console → Gemini billing → set a budget alert if not already at $30/day cap. Check `anonymous_attempts` for an abuse spike: `select count(*), sum(cost_usd) from public.anonymous_attempts where created_at >= current_date;` If the anonymous budget is the cause, the trial auto-disables (see `ANONYMOUS_DAILY_BUDGET_USD` in `lib/env.ts`). | Self                                                                                        |
| Customer emails `legal@`                                      | `docs/sops/takedown.md`. Respond within 24h. Do not engage on substance until you have read the SOP.                                                                                                                                                                                                                                                              | Self; if monetary damages threatened, lawyer (see takedown SOP §"When to involve a lawyer") |
| Customer emails `support@` with a refund or billing complaint | `docs/sops/refund_request.md`. Respond within 24h.                                                                                                                                                                                                                                                                                                                | Self                                                                                        |
| Stripe webhook 4xx/5xx rate > 1% trailing-1h                  | Open `/admin/audit` and grep for `source=stripe`. If the count stops climbing but is missing recent events, the webhook is failing — check Stripe Dashboard → Developers → Webhooks → Logs. The `webhook_events` table dedupes by `event_id`, so a missing event means the handler 500'd before insert.                                                           | Self                                                                                        |
| `pg_cron` job fails (no rows updated when expected)           | Run `select jobid, jobname, status, return_message from cron.job_run_details order by start_time desc limit 20;` in Supabase SQL editor. Most common failure: extension drift after a Supabase upgrade. Re-run the relevant migration block from `supabase/migrations/20260527000005_pg_cron.sql`.                                                                | Self                                                                                        |
| Supabase project storage quota > 80%                          | Storage explorer → identify largest buckets. Outputs bucket should auto-purge via `pg_cron purge_expired_generations` (rows) + Edge Function (objects). If rows are gone but objects remain, the Storage purge worker is broken — check the Edge Function logs.                                                                                                   | Self                                                                                        |
| `admin_audit_log` shows actions by an unknown `admin_id`      | Cross-reference against `public.admin_users`. If the actor is not in `admin_users`, you have an RLS hole. Stop the world.                                                                                                                                                                                                                                         | Self; post-acquisition: buyer's security contact                                            |

---

## Operating mental model

Three things must keep flowing for Botdog to stay healthy:

1. **Credits in.** Stripe payouts on schedule, refund rate under control.
2. **Generations out.** Gemini key valid, Edge Function healthy, no quota leaks.
3. **Trends fresh.** New trends ship every 2-4 weeks, stale ones retire.

The morning check covers #1 and #2 by exception. The Sunday check covers #1 and #2 in aggregate plus the slow-moving variables (retention, repeat-purchase). The monthly check is for #3 and accounting hygiene.

If you do nothing else, do the morning check. The product can survive a missed Sunday once; it cannot survive an unnoticed Stripe payout failure for two weeks.
