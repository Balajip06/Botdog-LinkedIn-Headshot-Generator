# Google Ads Launch — $500/mo Plan

**Last updated:** 2026-05-29
**Channel:** Paid search + Performance Max
**Budget:** $500/mo ($16-25/day with W3 reset opportunity)
**Target CAC:** $10 (kill > $15, scale < $8 with ROAS > 1.5)

Operational scaffold. Don't customize before launch — run the default, let CAC data tell you what to change.

---

## Credentials needed (Day 0)

- Google Ads account (free; needs a credit card on file at activation, not before)
- Google Search Console verified for the production domain (DNS-level verification via Cloudflare TXT record — see [docs/RUNBOOK.md](../RUNBOOK.md))
- Google Analytics 4 (GA4) property created + linked to Google Ads (the `purchase` conversion event imports from GA4 — don't define it twice)
- Conversion-tracking pixel installed: GA4 measurement ID added via Next.js `<Script>` in [`app/layout.tsx`](../../app/layout.tsx) (W2 task — currently no GA4 wired)

If GA4 isn't ready by Day 0, ship the campaigns anyway with the Google Ads conversion tag as fallback; backfill GA4 import within 72h.

---

## Account setup

1. Create Google Ads account → skip the "Smart campaign" onboarding (lock in Expert Mode)
2. Link Search Console: `Tools → Setup → Linked accounts → Search Console → add domain`
3. Link GA4: `Tools → Setup → Linked accounts → Google Analytics (GA4) → import all conversion events`
4. Define `purchase` as the primary conversion (imported from GA4 — fires on Stripe checkout success page after redirect from [`app/api/stripe/checkout/route.ts`](../../app/api/stripe/checkout/route.ts))
5. Set `purchase` value = dynamic (read from `transaction_total` event param — the credit-pack price)
6. Enable enhanced conversions (hashes user email → improves attribution by ~15%)

---

## Campaign structure

Two campaigns, no more. Splitting further fragments the budget below Google's bid-learning threshold.

### Campaign 1 — Search (60% of budget = $300/mo)

- Campaign type: Search
- Bidding: Maximize conversions (let Google learn for 2 weeks; switch to Target CPA = $10 only after 30+ conversions)
- Locations: US, UK, CA, AU (English-speaking, high-AOV markets)
- Languages: English
- Networks: Search network ONLY (uncheck Display, uncheck Search partners — both waste budget)
- 3 ad groups (one per keyword bucket — see below)

### Campaign 2 — Performance Max (40% of budget = $200/mo)

- Campaign type: Performance Max
- Bidding: Maximize conversion value
- Audience signals: upload customer match list (post-launch — once you have 100+ paying customers) + Google's "AI image generator users" in-market segment
- Asset groups: 1 per landing page (4 asset groups total — see "Landing-page mapping")
- 15 headlines, 5 descriptions, 1 logo, 5 images (carousel of best eval outputs)

---

## Keyword list (Search campaign)

Three ad groups, ~25 keywords total. Match types: BMM = broad-match modifier (now "broad" in Google's UI), "phrase", [exact].

### Ad group A — "AI image generator" (broad intent, high volume)

```
ai image generator                          [broad]
"ai image generator"                        [phrase]
[ai image generator]                        [exact]
ai photo generator                          [broad]
"ai photo generator"                        [phrase]
ai art generator                            [broad]
"ai art generator free"                     [phrase]
[ai art generator]                          [exact]
ai picture maker                            [broad]
"ai picture maker"                          [phrase]
```

### Ad group B — Trend-specific (Ghibli, anime, midjourney alternatives)

```
ghibli filter                               [broad]
"ghibli filter ai"                          [phrase]
[ghibli filter]                             [exact]
"studio ghibli style ai"                    [phrase]
anime portrait ai                           [broad]
"anime portrait generator"                  [phrase]
[anime ai filter]                           [exact]
midjourney alternative                      [broad]
"midjourney alternative free"               [phrase]
[midjourney alternative]                    [exact]
chatgpt image generator alternative         [broad]
```

### Ad group C — "free ai art" + qualifier intent

```
free ai art                                 [broad]
"free ai art generator"                     [phrase]
[free ai image generator]                   [exact]
ai photo filter free                        [broad]
"turn photo into anime"                     [phrase]
"turn photo into ghibli"                    [phrase]
ai portrait maker free                      [broad]
"ai selfie filter"                          [phrase]
[ai photo style transfer]                   [exact]
```

---

## Negative keyword starter list (apply to all campaigns)

These drain budget at zero conversion intent.

```
-tutorial            -course              -free download
-stock photo         -nude                -nsfw
-jobs                -api                 -reddit
-discord             -prompt              -github
-open source         -python              -tensorflow
```

Add to a shared negative keyword list: `Tools → Shared library → Negative keyword lists → "Global negatives"` → apply to both campaigns.

---

## Landing-page mapping

Routes that don't exist yet (`/vs-midjourney`, `/free-ghibli-effect-maker`) are W2 build tasks — see [.claude/todo.md](../../.claude/todo.md). Until they ship, all queries route to `/` and the homepage takes the hit.

| Query bucket | Landing page | Why |
|---|---|---|
| Ad group A ("ai image generator") | `/` | Highest-intent homepage; conversion CTA above the fold |
| Ad group B Ghibli/anime variants | `/free-ghibli-effect-maker` (when shipped) → fallback `/trend/<ghibli-slug>` | Match keyword to trend page for tightest message |
| Ad group B "midjourney alternative" | `/vs-midjourney` (when shipped) → fallback `/` | Comparison page converts skeptical Midjourney users at 2-3x homepage rate |
| Ad group C "free" qualifier intent | `/` (free-tier CTA prominent) | Don't waste on `/pricing` — these users haven't decided to pay yet |
| Performance Max | `/`, `/pricing`, `/trend/<top-3-slugs>` | Let Google rotate assets across the 4 best converting pages |

---

## Budget ramp

| Week | Daily budget | Total spend (running) | Decision point |
|---|---|---|---|
| 1 | $20/day | $140 | Observe — no changes; bid learning needs 7+ days |
| 2 | $25/day | $315 | Pause keywords with > $30 spend + 0 conversions |
| 3 | $25/day | $490 | Evaluate CAC vs $10 target — kill, hold, or scale |
| 4 | Variable | — | Scale to $40/day (if CAC < $8) or kill (if CAC > $15) |

Don't change bids mid-week. Bid changes reset Google's learning phase — every adjustment costs you ~3 days of conversion signal.

---

## KPI gates

### Kill criteria (any one of)

- CAC > $15 after $250 spent
- Conversion rate < 1% across all ad groups by W3
- Quality Score < 4 on > 50% of keywords (means landing pages aren't matching ad copy — fix copy or kill)

### Scale criteria (all of)

- CAC < $8 sustained for 7+ days
- ROAS > 1.5 (revenue from conversions > 1.5x ad spend)
- Conversion volume > 30/week (enough signal to support Target CPA bidding)

Scaling means $40 → $60 → $80/day, doubling weekly until CAC starts climbing back toward $10. The ceiling is where you stop.

---

## UTM convention

Every ad's final URL appends:

```
?utm_source=google&utm_medium=cpc&utm_campaign={campaign}&utm_content={ad_group}&utm_term={keyword}
```

`{campaign}`, `{ad_group}`, and `{keyword}` are Google Ads ValueTrack parameters — auto-filled at click. PostHog reads these on page load and writes them to the `signup` event's `acquisition_source` property (see migration [`20260529000003_profiles_acquisition_source.sql`](../../supabase/migrations/20260529000003_profiles_acquisition_source.sql) for the column).

Verify on Day 1 by clicking your own ad in incognito and checking that `profiles.acquisition_source` for the new test signup contains `google_cpc:{campaign}:{keyword}`.

---

## Cross-references

- [docs/acquisition/README.md](./README.md) — decision matrix + once-chosen checklist
- [`app/api/stripe/checkout/route.ts`](../../app/api/stripe/checkout/route.ts) — where the `purchase` conversion fires (success redirect URL)
- [`supabase/migrations/20260529000003_profiles_acquisition_source.sql`](../../supabase/migrations/20260529000003_profiles_acquisition_source.sql) — `acquisition_source` column for UTM attribution
- [docs/LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md) — production domain + tracking pixel prerequisites
