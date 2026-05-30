# Weekly Trend Cadence SOP

**Last updated:** 2026-05-29
**Owner:** Operator (you, while solo); post-acquisition: buyer's content operator.
**Cadence:** One new trend shipped every Friday. ~2-3 hours of focused work per cycle.
**Authority:** Operationalizes the KPI gate in the sellable-asset plan ("fresh trend per week is the content moat").

This is the single thing that keeps Trendly's catalog alive. The product can survive a missed Sunday operations check; it cannot survive a four-week stretch with no new trend. Customers come back when there's something new — without a new trend, the home grid grows stale and repeat-purchase rate collapses inside 30 days.

---

## Cadence

Why Friday, specifically:

- **Weekend engagement is highest** across consumer image-gen — users open the app between 7pm Friday and 11pm Sunday in their local timezone. Shipping Friday morning UTC catches the US workday tail + the EU evening + the AU/NZ overnight.
- **Trend hits early adopters before going viral on TikTok.** TikTok's viral cycle for visual trends runs Thu-Sat. Shipping Friday means our trend page is indexed by Google by Saturday morning when "how to make the X effect" searches spike.
- **Sunday `pg_cron reset_free_weekly` (00:00 UTC) refills 5 free credits.** A Friday launch gives free-tier users 36-48 hours of fresh quota to try the new trend without paying — drives free→paid conversion when they hit the wall on Sunday/Monday.
- **Friday gives you Saturday for triage** before the social push peaks. If eval missed a safety failure mode, you have 24 hours to fix or pull before TikTok picks it up.

The cadence is non-negotiable. If you slip a Friday, ship Saturday — don't skip the week. A skipped week shows up as a flatline in `/admin` cohort retention 2-3 weeks later.

---

## Trend sourcing (Tuesday-Wednesday, ~45 min)

The earlier in the week you decide the trend, the more time you have for prompt iteration + eval.

### Step 1 — Review the auto-detected candidates

1. Open `/admin/suggestions`.
2. Filter to `status='pending'` rows from the last 7 days. These came from the weekly Reddit cron (post-MVP — once Phase 6 ships, the cron seeds this inbox automatically; pre-MVP, the inbox is user-submitted suggestions only).
3. Sort by `score` desc (higher = more upvotes / more cross-references).

Each row gives you: source URL, the LLM's first-pass description, raw text from the source, and a confidence score. Read 5-10 rows. The auto-detector misses nuance — you're looking for the trend, not the LLM's interpretation of the trend.

### Step 2 — Cross-reference (manual, no creds needed)

Open three tabs:

- **TikTok creative center** — https://ads.tiktok.com/business/creativecenter/ — free with a TikTok account. Filter to "Trending hashtags → last 7 days → visual content". This is the highest-signal source for what's about to hit; TikTok's algorithm surfaces trends here 3-7 days before they peak.
- **Twitter/X trending hashtags** — search `#aiart`, `#midjourney`, `#chatgpt` and look at the top quoted-tweet replies in the last 24h. The repeated "look what I made" pattern is what you're chasing.
- **Reddit** — `r/aiArt` ("Hot" tab, last week) + `r/midjourney` ("Top" tab, last week). Scan the top 20 posts. Patterns that repeat across users are real trends; one-off "look at this single image" posts are not.

For each candidate, ask: is the same visual hook appearing across two or more platforms in the same week? If yes, it's a real trend. If no, it's noise.

### Step 3 — Pick exactly one trend

The winning trend must have all three:

1. **Visual hook** — at a glance, before reading any caption, you can tell what the trend is doing. If a user has to read to understand, it doesn't ship.
2. **Clear "X applied to your photo" formula** — Trendly only ships trends that consume a user-uploaded photo + apply a transformation. Trends that require text-only prompts or text+photo bilingual inputs are out of scope.
3. **No franchise-IP exposure** — cross-reference against [`docs/TREND_BANLIST.md`](../TREND_BANLIST.md). If the trend names a studio (Pixar, Ghibli, etc.), a character (Mario, Mickey, Pokémon), or a celebrity, either re-prompt to drop the name (acceptable-phrasing rules in the banlist) or reject the trend entirely.

If no candidate clears all three, **don't ship a weak trend.** Skip the auto-detector inbox and pick from your evergreen backlog (action figure, portrait styles, era transforms). Better to repeat a proven trend than to ship a flat one.

---

## Trend authoring (Wednesday-Thursday, ~60-90 min)

This is the bulk of the cycle. Most of it is prompt iteration in the eval UI.

### Step 1 — Approve in `/admin/suggestions`

1. Open the chosen suggestion row.
2. Click **Approve & draft**. This creates a `trends` row with `eval_status='untested'`, `is_active=false`, and a stub prompt template seeded from the suggestion's LLM summary.
3. You're redirected to `/admin/trends/<id>/edit`.

### Step 2 — Refine the prompt template

Target length: ~300 characters. Longer prompts dilute Gemini's attention; shorter prompts under-specify.

Structure:

```
<aesthetic descriptor>, <style anchor 1>, <style anchor 2>, applied to {user_photo}. <composition cue>. <palette cue>.
```

Example (real Ghibli-replacement v2 prompt, ~280 chars):

```
soft hand-drawn 1990s animation aesthetic with pastel skies and dreamy lighting, watercolor-like brushwork, gentle lens flare, applied to {user_photo}. Subject remains photo-accurate. Pastel palette with sage green and dusty pink accents.
```

Rules:

- **Use the `{user_photo}` token** for the uploaded image substitution. Gemini's interpolation expects this exact token (see `lib/gemini/client.ts` interpolation logic).
- **Include 1-2 style anchors** — concrete visual elements (lens flare, brushwork, specific palette names). The model converges faster with anchors than with abstract style names.
- **End with a composition or palette cue** — gives the model a stable "settle here" instruction when the rest of the prompt is ambiguous.
- **Never name a franchise, studio, or living artist.** Re-read [`docs/TREND_BANLIST.md`](../TREND_BANLIST.md) "Acceptable phrasing rules" if you're tempted.

### Step 3 — Set the `input_schema`

For most trends, copy from a similar existing trend:

```json
{
  "images": [
    {
      "name": "user_photo",
      "label": "Your photo",
      "required": true,
      "max_count": 1
    }
  ]
}
```

If the trend takes additional inputs (e.g. a "power name" text field for an anime trend), add a `text` field to the schema:

```json
{
  "images": [{ "name": "user_photo", "label": "Your photo", "required": true, "max_count": 1 }],
  "text": [
    {
      "name": "power_name",
      "label": "Your power's name",
      "required": false,
      "max_length": 40,
      "placeholder": "e.g. Solar Storm"
    }
  ]
}
```

The schema feeds `components/upload/SchemaForm.tsx` — the form renders dynamically. Never hardcode field counts.

### Step 4 — Add description + FAQ

Open the same `/admin/trends/<id>/edit` page. Fill:

- **Description** — 2-3 sentences. The hook + how the result looks + a one-line "why now" if it's topical.
- **3 FAQ items** — these power the SSR `application/ld+json` JSON-LD `FAQPage` schema and drive long-tail SEO. Standard three:
  1. "How does this trend work?" — answer in plain language without saying "Gemini" or "AI model".
  2. "Will it work with multiple people in the photo?" — answer based on what the eval showed.
  3. "Why does my output look like X?" — pre-empt the most common quality complaint from the eval phase.

### Step 5 — Add reference photos in the eval UI

1. Navigate to `/admin/trends/<id>/eval`.
2. Upload 2-3 reference photos that span the realistic user base:
   - One portrait (single subject, well-lit).
   - One group photo (2-4 people).
   - One challenging case (low light, side angle, glasses, hat — whatever the trend's failure mode is likely to be).
3. Each input photo becomes a row in the eval grid.

### Step 6 — Run the eval

1. Click **Run eval**. This dispatches one Gemini call per input photo via the same `/api/generate` path as production.
2. Wait ~3 minutes. Each call is 30-60s; the grid updates as results land.
3. Review each output side-by-side with its input.

Pass criteria (all must hold):

- The subject from the input photo is recognizable in the output.
- The aesthetic from the prompt is unambiguously applied.
- No safety filter rejection across any input.
- No watermark / signature / logo from a known franchise visible in the output (Gemini occasionally hallucinates a "Disney" or "Pixar" wordmark even when the prompt doesn't ask for it — auto-fail if present).

If any input fails, refine the prompt and re-run. Common refinements:

- Subject not recognizable → add "subject remains photo-accurate" or "preserve facial features".
- Aesthetic not strong enough → add a more concrete style anchor (lens flare, brushwork, specific palette).
- Safety reject → drop any borderline language; reword.

### Step 7 — Flip `is_active=true`

Only after eval passes:

1. Click **Mark as passed** in the eval UI. This sets `eval_status='passed'`.
2. Navigate back to `/admin/trends/<id>/edit`.
3. Set `is_active=true`. The eval gate constraint at migration `20260527000002_trends.sql` allows it now (`is_active=true` requires `eval_status='passed'`).
4. Save.

The trend is now live but `goes_live_at` may still be in the future (see launch step 1 below). The trend stays out of the public catalog until that timestamp passes — set it before flipping `is_active`.

---

## Launch + announce (Friday 17:00 UTC)

### Step 1 — Schedule `goes_live_at`

On the `/admin/trends/<id>/edit` page, set `goes_live_at = next Friday at 17:00 UTC`. The home grid + sitemap pull `is_active = true AND goes_live_at <= now()`, so the trend stays invisible until that moment.

17:00 UTC is chosen because:

- US East coast lunch + West coast start-of-day (10am PT / 1pm ET).
- EU evening start (6pm CET / 7pm EET).
- Catches the highest-attention window across both major markets without favoring either.

### Step 2 — Pre-write social posts

Before Friday morning, write three captions and stash them in a notes file. Templates below — copy and customize per trend.

### Step 3 — Post at goes_live_at + 30 min

Wait 30 minutes after the trend goes live, then post on social. Why the gap:

- Google's crawler needs ~20 minutes to discover the new `/trend/<slug>` page via the updated sitemap. Posting before indexing means your social traffic doesn't contribute to early SEO signal.
- The 30-min buffer lets you smoke-test the trend page in your own browser before broadcasting. Look for: hero image renders, OG card renders, schema-form upload accepts, the "Try free" button works.

Post order (matters):

1. **X first** — fastest to spread among early adopters. Format: hashtag-heavy thread.
2. **Threads + Bluesky** — same content as X, 10-min stagger.
3. **Instagram** — single carousel post, 30 min after X.
4. **TikTok** — 15-60s video showing input → output → input → output cycle, 1-2 hours after X (TikTok rewards staggered posting over same-hour cross-posting).

### Step 4 — Cross-link from the homepage hero

In `/admin/trends/<id>/edit`, set `is_featured=true`. The home page hero pulls the most-recently-featured active trend. Only one trend should be featured at a time — un-feature the previous one in the same session.

---

## First-24h triage (Friday evening through Saturday)

The first 24 hours decide whether the trend lives or dies.

### Step 1 — Quota-blocks every 2-3 hours

Open `/admin`. Watch the "quota blocks last 24h" tile. Quota blocks happen when a free-tier user hits 5/5 weekly generations OR a user with 0 credits tries to generate. **High quota blocks are a buy signal** — the user wanted the trend badly enough to hit the wall. If blocks > 50 in 24h on a single trend, double down: surface the credit-pack CTA more aggressively, post a "still spots open" follow-up on social.

### Step 2 — CTR on `/admin/engagement`

Look at the new trend's `views / clicks / starts / completes` funnel:

- **CTR (clicks / views) > 18%** — viral. Reinforce: pin to social, run a second-day post, consider Reddit/IG cross-promo.
- **CTR 8-18%** — solid. Default trajectory.
- **CTR 5-8%** — flat. The trend page works but the hook isn't landing. Consider editing the description or OG card.
- **CTR < 5%** — dead on arrival. Deactivate after the weekend (Sunday evening) so it doesn't pollute the home grid.

### Step 3 — Refund-rate spike

In `/admin`, the refund-rate tile is filtered by trend. If the new trend's refund rate is > 2x the catalog average (typically 5%), the eval missed a failure mode that production traffic surfaced. Common cases:

- A user demographic the eval didn't represent (e.g., children's photos when the eval was all adults).
- A photo type that always rejects (e.g., glasses-on portraits).

Action: re-open `/admin/trends/<id>/eval`, add 3-5 more reference photos covering the failure pattern, re-run, refine prompt if needed. The `bump_trend_version` trigger will flip `eval_status='untested'` and `is_active=false` automatically on the prompt edit; you'll need to re-run eval and re-activate.

---

## Retire process

Trends decay. The catalog rule of thumb: keep the 12-20 best-performing trends live; retire the rest.

### Automated retirement (preferred — post W5)

The auto-deactivate `pg_cron` job (W5 #36 in the sellable plan) marks any trend with CTR < 4% averaged over the trailing 7 days as `is_active=false`. No manual intervention.

### Manual retirement (pre-W5)

```sql
update public.trends
   set is_active = false
 where slug = '<slug>';
```

Retire when any of:

- CTR < 4% for 7 days running.
- Refund-rate > 10% sustained.
- A takedown landed on this trend (then follow [`docs/sops/takedown.md`](./takedown.md) Step 3b).
- The trend has been live > 90 days and is no longer in the top 20 by 7-day generations.

Don't delete the row — `is_active=false` removes it from the public catalog while preserving historical generations + share URLs. Hard-deletion breaks any user who linked to `/trend/<slug>` from outside.

---

## Templated social captions

Replace `<>` placeholders before posting. Trend titles and hooks vary; the structure is what stays.

### X / Twitter (hashtag-heavy, thread-friendly)

```
new trend on Trendly: <trend title>

drop your photo → get a <one-line aesthetic descriptor>

try it free → trendly.app/trend/<slug>

#aiart #<trendname> #<aesthetic-hashtag> #midjourney #chatgpt
```

For higher engagement, fork into a 3-tweet thread:
- Tweet 1: hook + before/after image (the eval's strongest output).
- Tweet 2: one specific use case ("perfect for [holiday / season / event]").
- Tweet 3: link + 4 hashtags.

### Instagram (vibey, emoji-light, single image or carousel)

```
the <trend title> trend just dropped on Trendly

drop a photo, get this back in 60 seconds.
free to try — link in bio.
```

Use the trend's `sample_after_url` as the IG image. If the trend supports group photos, post a carousel: solo result, duo result, group result.

Stay light on emoji — the brand is "polished consumer SaaS", not "hyperactive Gen Z TikTok account". Two emoji max per caption.

### TikTok (urgency / POV style, 15-60s video)

```
POV: you just discovered Trendly
it turns any photo into <one-line aesthetic descriptor>
this is wild — link in bio
```

Video structure (proven format):
- **0-2s** — hook: a clean input photo on screen, no text.
- **2-8s** — transformation reveal: cut to the output, text overlay "this is just from a photo".
- **8-15s** — second example, different subject (group, pet, child).
- **15-30s** — voiceover or text: "trendly.app, free for 5 a week".
- **End frame** — "try yours, link in bio".

TikTok rewards in-app editing (CapCut → upload) over fully pre-rendered video. Add captions in TikTok itself, not in the video file.

---

## Cross-references

- [`docs/sops/daily_ops.md`](./daily_ops.md) — Sunday weekly review; the trend velocity SQL query.
- [`docs/sops/takedown.md`](./takedown.md) — what to do when a rights holder emails about the trend you just shipped.
- [`docs/TREND_BANLIST.md`](../TREND_BANLIST.md) — the off-limits names to check against before approving in Step 1.
- [`docs/RUNBOOK.md`](../RUNBOOK.md) Test 6 — schema-driven form verification (re-run if you change a schema shape).
- Migration `supabase/migrations/20260527000002_trends.sql` — the eval gate constraint + `bump_trend_version` trigger that re-runs eval on prompt edits.
- `app/admin/trends/[id]/eval/page.tsx` — the eval UI.
- `app/admin/suggestions/page.tsx` — the auto-detected candidates inbox.
- `lib/gemini/client.ts` — `{user_photo}` token interpolation.
