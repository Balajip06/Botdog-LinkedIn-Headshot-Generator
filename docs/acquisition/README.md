# Acquisition Channels — Decision Matrix

**Last updated:** 2026-05-29
**Owner:** Operator (you)
**Purpose:** Pick + fund exactly ONE acquisition channel at the top of W2 of the sellable-asset plan. Scaffolding for all three is staged so you can launch in < 2 hours once the decision is made.

This is a `pick-one` decision. Spreading $500/mo + ~15h/wk across three channels at week 2 gets you no data on any of them. Pick the channel that matches your current constraint (cash, time, or product-readiness) and go deep.

---

## Decision matrix

| Channel                           | Setup cost (one-time)                     | Time / week (sustained)          | Expected lift (W6)                                               | CAC range                                              | KPI to watch                                                 |
| --------------------------------- | ----------------------------------------- | -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| **Google Ads**                    | $0 (Google Ads + Search Console accounts) | ~2-3 h (review + adjust bids)    | +200-500 new signups/mo                                          | $5-15                                                  | Cost per `purchase` conversion, ROAS                         |
| **Creator outreach (manual DMs)** | $0 (3 cleared social accounts)            | ~15-20 h (sourcing + sending)    | +50-300 signups via referral codes                               | $0 cash, ~$3-8 in time-equivalent                      | Reply rate → code-issued → conversions per code              |
| **Referral automation**           | $0 (existing schema + trigger)            | ~1-2 h (Resend templates + ship) | +30-150 signups _if_ there's an existing user base to refer-from | $0 cash, $0.50-1.50 per referred user (the bonus pack) | % of new signups with `referred_by` set; viral coefficient k |

The numbers above are first-month conservative; mature compounding channels (referral) outperform their W6 number 3-5x by W12 if k > 0.3.

---

## Decision tree

```
Do you have $500/mo to spend on paid acquisition?
├── YES → Google Ads
│         (fastest signal; CAC is concrete by day 7; kill criteria are clean)
│         → docs/acquisition/google-ads-launch.md
│
└── NO → Do you have 15-20 h/week to source + DM creators?
         ├── YES → Creator outreach
         │         (no cash, builds compounding social proof, but time-intensive)
         │         → docs/acquisition/creator-outreach-dms.md
         │
         └── NO → Referral automation
                  (lowest ongoing effort, but needs an existing user base
                   of ~200+ to seed meaningful invites; if you have <50 active
                   users, defer until W4 and use this time to harden the product)
                  → docs/acquisition/referral-automation.md
```

The "no" branch is not a failure — it's a constraint match. Referral with < 50 users is throwing seeds on concrete. Google Ads with < $500/mo doesn't escape the noise floor of bid competition. Creator outreach with < 15 h/wk produces too small a sample to learn the message-market fit.

---

## Once chosen — activation checklist

Tie back into the W2 done-criteria in the sellable-asset plan. Mark `[x]` only with verifiable evidence (screenshot, dashboard URL, or SQL row count).

- [ ] Channel selected + posted to `.claude/session-log.md` with rationale
- [ ] Credential dependencies cleared (see channel doc's "Credentials needed" section)
- [ ] First 7-day spend / DM count / referral nudges fired
- [ ] UTM convention or referral code attribution wired into PostHog signup event
- [ ] CAC / cost-per-signup tracked daily in a single Sheet (channel doc links the template)
- [ ] Kill-or-scale decision committed in `.claude/session-log.md` by end of W2

If you hit W2 + 7 days and the channel hasn't produced its W6-target lift trajectory, **kill it and switch**. Don't sunk-cost — one channel exhausted is data, two channels half-attempted is noise.

---

## Why exactly one channel

The sellable-asset plan's W2 deliverable is "an acquisition channel firing with measurable CAC, not three half-built funnels." A buyer pays for proven distribution; proof requires a clean attribution chain. Three channels running simultaneously means every signup has ambiguous attribution and no channel has enough volume for the data to be conclusive.

Once one channel is _proven_ (CAC stable, ROAS > 1x for paid OR k > 0.3 for organic), W3+ adds a second. That's how the channel mix gets built — sequentially, not in parallel.

---

## Cross-references

- [docs/acquisition/google-ads-launch.md](./google-ads-launch.md) — $500/mo paid scaffold
- [docs/acquisition/creator-outreach-dms.md](./creator-outreach-dms.md) — 100-DM manual scaffold
- [docs/acquisition/referral-automation.md](./referral-automation.md) — operationalize existing referrals infra
- [`lib/referrals/links.ts`](../../lib/referrals/links.ts) — referral URL helpers (already shipped)
- [`supabase/migrations/20260527000004_ancillary.sql`](../../supabase/migrations/20260527000004_ancillary.sql) — `referrals` table + `maybe_reward_referral` trigger
- [docs/LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md) — production cred prerequisites
- [docs/sops/daily_ops.md](../sops/daily_ops.md) — where channel KPIs get reviewed (Sunday weekly check)
