# Creator Outreach — 100-DM Plan

**Last updated:** 2026-05-29
**Channel:** Manual DM outreach to mid-tier creators (3-50K followers)
**Budget:** $0 cash, ~15-20 h/week, 5 days
**Target:** 100 DMs sent, ≥ 8 replies, ≥ 3 active referral codes generating conversions by W4

Compounding social proof channel. No ad spend, but high-touch — every DM is a 1:1 sales pitch with the asymmetric upside of one creator's audience converting at 5-15x cold-traffic rates.

---

## Credentials needed (Day 0)

- 3 cleared social accounts (X, TikTok, Instagram) — minimum: profile photo + bio mentioning Trendly + pinned post linking to homepage. New accounts < 7 days old get rate-limited on DMs; warm them with 3-5 organic posts first
- Threads + Bluesky accounts (optional but doubles surface area at zero extra cost)
- Referral code provisioning for outreach: each accepted creator gets a custom-mapped code via [`lib/referrals/links.ts`](../../lib/referrals/links.ts) `buildReferralUrl(siteUrl, referralCode)`. Manual code issuance for now — auto-issuance is a W4 task
- A pinned tracking sheet (Google Sheets template — schema below)

---

## Target criteria

Apply ALL filters. A creator that fails any one is a waste of the DM slot.

- 3K-50K followers (below 3K = too small to move signups; above 50K = doesn't reply to cold DMs from sub-1K accounts)
- Last 30 days active (≥ 4 posts; dead accounts won't see the message)
- Content focus: AI art, aesthetic edits, Ghibli/anime filters, "make this photo look like X" tutorials, photo-editing apps
- Audience visibly engaged (likes-to-followers ratio > 2%; ratio < 0.5% means the account bought followers — DM is wasted)
- No competing sponsorship in last 30 days (search their last 10 posts for "ad", "sponsored", "#partner" — if they just promoted a competitor, the message gets ignored)

---

## Sourcing checklist (Day 1, ~2 h to build a list of 100)

- **X advanced search:** `(midjourney OR "ai art" OR ghibli filter) min_faves:50 -is:retweet lang:en` → scroll the last 7 days, capture handles posting about AI image gen
- **TikTok hashtag scroll:** `#aiart #ghiblifilter #midjourney #aiartcommunity` → filter "Recent" → grab any account with 3K-50K and visible engagement
- **Instagram explore:** Search `aiartgenerator` hashtag, sort by "Recent", same filter
- **Threads keyword search:** `"ai photo" OR "midjourney"` last 7 days
- **Reddit fallback:** `r/aiArt` top contributors (DMs OK but conversion is lower — Reddit users distrust commercial DMs)

Build the list in your tracking sheet before sending a single DM. Sourcing in parallel with sending = duplicates + missed criteria checks.

---

## DM templates

Keep openers under 30 words. The first sentence is the only thing that decides if they read the rest. NO sales-y opener ("Hey love your content!"). NO generic compliments ("Your work is amazing!"). Specific, observed, immediate.

### X / Twitter (DM)

```
Saw your <specific post — e.g. "Ghibli portrait thread last Tuesday">. Built Trendly — same vibe, one upload, no prompt engineering.

Offer: free 100-credit pack ($14.99 value) + your own branded link. Your audience gets 20% off their first pack via your code.

Sound interesting? Reply yes and I'll send the link.
```

### TikTok (DM)

```
Your <#aiart / #ghiblifilter — pick the actual hashtag they use most> stuff is the exact lane we built Trendly for.

Offer: free 100-credit pack to test it, plus a branded link. 20% off for anyone who comes from your code.

Want me to send the link?
```

### Instagram (DM)

```
Your edits in the <specific post or carousel> — we built a tool that does that in 60 seconds from a photo. No prompts.

Offer: free 100 credits ($14.99 value) + a branded link. Your audience gets 20% off via your code.

Drop a reply if you want to try it.
```

### Threads (post-reply or DM)

```
Building Trendly — same lane as your <recent post>. One photo, no prompt, ~60s.

Offer: 100 free credits + a branded link with 20% off for your audience.

Worth a look?
```

Tone rules across all four: lowercase first letter, no exclamation points, no emoji in the opener, no "love your content", no "quick question". Treat every DM like a peer message, not a sales pitch.

---

## FAQ rebuttal scripts

When they reply, the same 4-5 questions surface. Have these saved as text snippets.

### "Is this safe? What about my photos?"

> Uploads encrypt in transit + at rest. We auto-delete free-tier outputs after 30 days, paid Pro outputs are forever-retained but private. Photos never go to a training set — we use Gemini's API, no fine-tuning. Privacy doc: trendly.app/privacy

### "How much can I earn?"

> Your audience uses your branded link → 20% off first purchase → you get a free 50-credit pack ($14.99 value) per 3 successful invites (defined as: that referred user makes a purchase OR generates 3+ images). No cash payouts in W1 — bonus packs accumulate up to a $50 cap. We're working on direct payouts for top performers (W6+, after we hit revenue threshold).

### "Do I need to disclose this as a sponsorship?"

> Yes. FTC requires `#ad` or "in partnership with @trendly" in any post that links your branded code. Disclosure boilerplate below — copy/paste verbatim. We don't engage with creators who don't disclose. (This is a non-negotiable — a single non-disclosed post can earn FTC fines for both sides.)

### "Can I customize the trend / get an exclusive style?"

> Not yet — every Trendly user sees the same trend catalog. Custom trends are roadmapped for W8+. What we _can_ offer top creators: 48-hour early access to new trends before they go live to the public, so your audience gets the "first to try" angle.

---

## Tracking spreadsheet schema

One row per creator. Recompute conversions weekly from the `referrals` table via a 1-line SQL query (`select count(*) from public.referrals where referrer_id = <creator's profile_id> and status = 'rewarded'`).

| Column        | Type    | Notes                                                                                   |
| ------------- | ------- | --------------------------------------------------------------------------------------- |
| `handle`      | string  | `@creator_handle` — include the @ for greppability                                      |
| `platform`    | enum    | `x` / `tiktok` / `ig` / `threads` / `bluesky`                                           |
| `sent_date`   | date    | When first DM went out                                                                  |
| `replied`     | boolean | Any non-bounce reply (positive or negative)                                             |
| `code_issued` | string  | Their branded referral code (12-hex from `profiles.referral_code`)                      |
| `conversions` | int     | Successful invites attributed to their code (purchase OR 3+ generations)                |
| `LTV_so_far`  | decimal | Sum of `cost_usd` × pack margin for converted users (eyeball — formal LTV is a W6 task) |

Tracking sheet template lives in `~/Documents/trendly-ops/creator-outreach-tracking.xlsx` (you create on Day 1).

---

## Cadence

Day-by-day for one cycle:

| Day                       | Action                                                                                 | Target volume      |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| Mon                       | Source list (build 100-row sheet) + send 20 DMs                                        | 20 sent            |
| Tue                       | Send 20 DMs                                                                            | 40 sent cumulative |
| Wed                       | Send 20 DMs + reply to any Mon-Tue replies                                             | 60 sent            |
| Thu                       | Send 20 DMs + reply to Tue-Wed                                                         | 80 sent            |
| Fri                       | Send 20 DMs + reply to all open threads                                                | 100 sent           |
| Mon (W+1)                 | Day-3 follow-up to Mon-Thu unanswered DMs (only if read receipt fired; otherwise skip) | ~30 follow-ups     |
| Fri (W+1)                 | Day-7 follow-up to any remaining unanswered + read                                     | ~15 follow-ups     |
| After 2 unread follow-ups | Drop. Move on.                                                                         | —                  |

Follow-up template (same across platforms):

```
bump on the above — if it's not your lane, no worries.
otherwise, link's ready when you want it.
```

Never a third follow-up. Three pings is harassment; two pings is a professional courtesy.

---

## Disclosure boilerplate (FTC compliance)

Send to every accepted creator. Require them to include in any post that uses their branded link:

```
#ad
or
in partnership with @trendly
```

Position requirements (per FTC 16 CFR Part 255):

- X / Threads / Bluesky: in the body text, not just the bio. Above the link.
- TikTok: in the caption _and_ spoken/text-overlay in the video (FTC requires both for video content).
- Instagram: in the caption (first sentence preferred), plus the built-in "Paid partnership" label (Instagram surfaces this above the post).

If a creator pushes back on disclosure, walk away. The legal exposure is asymmetric — they lose, we lose harder.

---

## Cross-references

- [docs/acquisition/README.md](./README.md) — decision matrix + activation checklist
- [`lib/referrals/links.ts`](../../lib/referrals/links.ts) — `buildReferralUrl()` for creator branded codes
- [`supabase/migrations/20260527000004_ancillary.sql`](../../supabase/migrations/20260527000004_ancillary.sql) — `referrals` table schema (status, rewarded_at) for tracking SQL
- [docs/acquisition/referral-automation.md](./referral-automation.md) — backend infra that pays out the referrer bonus
