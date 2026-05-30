# Referral Automation — Activate Existing Infra

**Last updated:** 2026-05-29
**Channel:** In-product referral loop
**Budget:** $0 cash, ~1-2 h/week (Resend templates + monitoring)
**Target by W6:** ≥ 30% of new signups have `referred_by` populated; viral coefficient k ≥ 0.3

The schema, link helpers, and reward trigger already exist. This doc operationalizes them — Resend templates, reward terms, anti-farming rules, and the leaderboard plan.

---

## Existing infra (what's already shipped)

- `public.profiles.referral_code` — auto-generated 12-hex code per user on insert (see [`supabase/migrations/20260527000001_profiles.sql`](../../supabase/migrations/20260527000001_profiles.sql))
- `public.profiles.referred_by` — FK populated on signup if `?ref=<code>` cookie present (see middleware that reads `tig_ref` cookie)
- `public.referrals` table — one row per (referrer → referee) pair; `status` enum `'pending' | 'rewarded'` (see [`supabase/migrations/20260527000004_ancillary.sql`](../../supabase/migrations/20260527000004_ancillary.sql))
- `public.maybe_reward_referral()` trigger — fires on `generations` UPDATE-to-completed; flips referral status to `'rewarded'`, credits referrer +10 credits up to a `bonus_credits_earned <= 50` cap (same migration, lines 39-69)
- [`lib/referrals/links.ts`](../../lib/referrals/links.ts) — `buildReferralUrl()`, `parseReferralFromUrl()`, `parseReferralFromCookie()`, `REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 days`

What's NOT shipped (this doc enumerates what to build):

- Resend email nudges (4 templates listed below)
- 20%-off-first-purchase coupon for referees (requires a new `profiles.first_purchase_discount_applied` column + Stripe coupon issuance in [`app/api/stripe/checkout/route.ts`](../../app/api/stripe/checkout/route.ts))
- Leaderboard UI on `/me/settings` (defer; not required for activation)

---

## Referrer reward

**Current implementation:** +10 credits per successful referral (referee's first completed generation), capped at +50 lifetime bonus credits.

**W2 upgrade — "free pack per 3 invites":**

- Definition of "successful invite": referred user (a) made one or more paid Stripe purchase, OR (b) generated 3+ images (whichever fires first)
- Reward: 1 free 50-credit pack ($14.99 value) per 3 successful invites — granted as a `credits_balance += 50` write with `admin_audit_log` entry tagged `action='credit_grant'`, `after->>source='referral_pack'`
- Cap: 4 packs lifetime (= 200 free credits = $59.96 in margin we're spending to acquire users). Beyond 4 packs, the referrer becomes a candidate for the leaderboard / direct-payout track

Implementation note: the current trigger awards `+10` per individual referral. To switch to "free pack per 3 invites", either (a) update [`maybe_reward_referral()`](../../supabase/migrations/20260527000004_ancillary.sql) to count rewarded referrals and grant the pack on every 3rd, or (b) keep the +10 per referral but add a second trigger that detects the 3-rewarded-referrals threshold and grants a bonus pack. Option (b) is reversible — recommended.

---

## Referee reward (20% off first purchase)

**Status:** NOT YET SHIPPED. Requires:

1. New column: `profiles.first_purchase_discount_applied boolean default false`
2. Stripe coupon `REF20FIRST` created in Stripe Dashboard (one-time 20% off, no expiry, capped at 1 use per customer)
3. In [`app/api/stripe/checkout/route.ts`](../../app/api/stripe/checkout/route.ts), when `profile.referred_by IS NOT NULL AND profile.first_purchase_discount_applied = false`, attach the coupon to the checkout session via `discounts: [{ coupon: 'REF20FIRST' }]`
4. On successful webhook (`checkout.session.completed`), flip `first_purchase_discount_applied = true` to prevent re-use

Pricing math: 20% off a $14.99 pack = $11.99 paid. Stripe takes ~$0.65 + 2.9%, Gemini cost ~$0.04 × ~25 generations from a 200-credit pack = $1.00, net margin ~$10. Compared to Google Ads at $5-15 CAC, referral CAC = the $3 discount + the $0.50 in bonus credits we eventually pay the referrer = ~$3.50 fully loaded. **Cheapest channel by 3-4x.**

---

## Email nudges (Resend templates)

All four templates live in `lib/email/templates/` (W2 build task — not shipped). Each is a function returning `{ subject, html, text }` from a `react-email` component.

| Trigger | Recipient | Template name | When it fires |
|---|---|---|---|
| Referee signs up via `?ref=` | Referrer | `referralJoined` | Immediate (within 60s of `auth.users` insert) |
| First successful invite | Referrer | `firstInviteRewarded` | When `referrals.status` flips to `'rewarded'` for the first time |
| 1 invite away from free pack | Referrer | `nearPackUnlock` | When referrer has 2 of 3 rewarded referrals for the next pack tier |
| Pack unlocked | Referrer | `packUnlocked` | Immediately after the 3rd referral triggers a pack grant |

Each template MUST:

- Open with the referrer's first name (fallback: "Hey")
- Mention the referee by first name (NOT email — privacy)
- Include their referral link (regenerated server-side, not stored in template body)
- Have a one-click "share again" CTA that opens the platform-specific share intent (X tweet composer, IG DM intent on mobile, copy-to-clipboard fallback)
- Include unsubscribe link (Resend handles automatically via `List-Unsubscribe` header — but the unsub link must route to `/me/settings#email-preferences`, not break the user out of the app)

Send via [`lib/email/send.ts`](../../lib/email/send.ts) — already wired for Resend; short-circuits if `RESEND_FROM_EMAIL` is unset (see [docs/LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md) for cred state).

---

## Leaderboard UI (defer if time tight)

**Spec:** Read-only table on `/me/settings` showing top 10 weekly referrers by `count(referrals) where status='rewarded' and rewarded_at >= now() - interval '7 days'`.

Columns: rank, masked handle (`@john****`), rewarded referrals this week, bonus credits earned.

**Why defer:** A leaderboard with < 50 active referrers shows 4-5 names — looks broken, not aspirational. Wait until you have ≥ 50 referrers with ≥ 1 rewarded invite each (likely W4-W6) before shipping.

Until then: a static "you're 2 invites from your next free pack" progress bar on `/me/settings` does the motivational work without exposing thin leaderboard data.

---

## Anti-farming rules (in human terms)

The amended plan and the `referrals` migration imply these guards; the runtime enforcement is split between (1) the unique constraint `referrals.referred_id` (one referrer per referee), (2) the trigger's check that the referee has 0 prior completed generations before rewarding, and (3) the bonus cap of `bonus_credits_earned <= 50` per referrer.

In human terms:

- **Same IP block** — if a referee signs up from the same IP as their referrer within 24 hours, the referral is held in `status='pending'` and flagged for manual review (W2 build task: add `referrals.flagged_reason text` column + admin review UI)
- **Fingerprint dedup** — referees whose browser fingerprint matches an existing `profiles.id` are blocked at signup (they're a duplicate account, not a new referral)
- **Signup velocity threshold** — > 3 signups attributed to one `referrer_id` in any 10-minute window auto-pauses the referrer's code (sets `profiles.referral_code = null`); admin unblocks via `/admin/audit` review
- **Bonus credits cap** — hard ceiling of 50 bonus credits ever credited to one referrer via the trigger path. Bypassing requires admin manual grant (audit-logged)
- **First-completed-generation gate** — the trigger only rewards on the referee's *first* completed generation. Repeated generations by the same referee don't multi-reward

Once `lib/referrals/farming-guard.ts` exists as a dedicated module (W3 task), this section links to it directly.

---

## KPI gates

| Metric | Target by W6 | Where to check |
|---|---|---|
| % new signups with `referred_by` populated | ≥ 30% | `select 100.0 * count(*) filter (where referred_by is not null) / count(*) from public.profiles where created_at >= now() - interval '30 days'` |
| Viral coefficient k | ≥ 0.3 | `(rewarded referrals last 30d) / (active users 30d ago)` — k=0.3 means every 10 users bring 3 new ones |
| Referee → paying conversion rate | ≥ 12% | Higher than the 6-8% baseline because the 20% discount converts on-the-fence users |
| Bonus packs granted | 5-15 per 100 active users by W6 | `admin_audit_log` entries with `after->>source='referral_pack'` |

---

## Why this beats Google Ads for $0 budget

Viral coefficient math (k = new users brought per existing user):

- k = 0.0 → no growth, every signup is from cold acquisition
- k = 0.3 → MAU compounds 1.43x per cycle (`1 / (1 - k)` = `1 / 0.7`)
- k = 0.5 → MAU compounds 2x per cycle
- k = 1.0 → exponential growth (theoretically unbounded — never actually happens)

If your average user "cycle" (time from signup to converting their first 1-2 invites) is 30 days, then k=0.3 means:

- W0: 100 users
- W4: 143 users
- W8: 204 users
- W12: 291 users

That's a 30% MAU lift sustained indefinitely at $0 marginal acquisition cost. Google Ads at $500/mo with $10 CAC adds 50 users/mo — linear growth, capped by budget. **Referral compounds; ads accumulate.**

The catch: referral only works if there's a user base to refer FROM. With <50 active users, the absolute number of invites generated is too low to overcome attrition. That's why the decision tree in [`docs/acquisition/README.md`](./README.md) gates referral behind "no other constraint applies" — it's not the fastest channel, just the cheapest one to sustain past W12.

---

## Cross-references

- [docs/acquisition/README.md](./README.md) — decision matrix + activation checklist
- [`lib/referrals/links.ts`](../../lib/referrals/links.ts) — link building + cookie parsing
- [`supabase/migrations/20260527000001_profiles.sql`](../../supabase/migrations/20260527000001_profiles.sql) — `referral_code` + `referred_by` columns
- [`supabase/migrations/20260527000004_ancillary.sql`](../../supabase/migrations/20260527000004_ancillary.sql) — `referrals` table + `maybe_reward_referral()` trigger
- [`app/api/stripe/checkout/route.ts`](../../app/api/stripe/checkout/route.ts) — where the 20% coupon attaches at checkout
- [`lib/email/send.ts`](../../lib/email/send.ts) — Resend wrapper for the 4 nudge templates
- [docs/LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md) — `RESEND_FROM_EMAIL` + Stripe coupon prerequisites
