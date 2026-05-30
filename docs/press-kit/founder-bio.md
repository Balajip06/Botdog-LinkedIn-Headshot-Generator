# Trendly — Founder Bio Templates

**Last updated:** 2026-05-29
**Use:** Press kit, Product Hunt maker page, About page, LinkedIn / X bio, journalist outreach.
**Voice:** First-person, factual, no superlatives, no "passionate about". Specific over generic.

All factual claims below are bracketed as `[PLACEHOLDER]` until the founder background sheet is filled in. Run the checklist at the bottom before using any of these in public copy.

---

## Version A — One-sentence (under 220 chars, for X / LinkedIn bio + footer credits)

`[FOUNDER_NAME]` is the founder of Trendly, a curated viral-trend image generator — previously `[PRIOR_ROLE_OR_PROJECT]`.

---

## Version B — One-paragraph (for press kit, about page, Product Hunt)

`[FOUNDER_NAME]` is the founder of Trendly. Before Trendly, `[PRIOR_ROLE_AND_DURATION]`. The thesis behind Trendly came from `[ORIGIN_STORY — one specific moment, not "I noticed people wanted to..."]`. `[FOUNDER_NAME]` is based in `[CITY, COUNTRY]` and writes about `[TOPIC]` at `[PERSONAL_SITE_OR_NEWSLETTER]`. Contact: `[FOUNDER_EMAIL]`.

---

## Version C — Full-page (for journalist briefings, acquirer due-diligence packets, investor outreach)

### Background

`[FOUNDER_NAME]` is the founder and sole operator of Trendly, a curated viral-trend image generator built between `[BUILD_START_DATE]` and `[BUILD_END_DATE]`.

### Prior work

- `[PRIOR_PROJECT_1]` — `[ONE_SENTENCE_OUTCOME — revenue, exit, user count, or shutdown reason. Be honest about shutdowns; acquirers respect post-mortems]`. (`[YEAR_RANGE]`)
- `[PRIOR_PROJECT_2]` — `[ONE_SENTENCE_OUTCOME]`. (`[YEAR_RANGE]`)
- `[PRIOR_ROLE_1]` at `[COMPANY]` — `[ONE_SENTENCE_OUTCOME]`. (`[YEAR_RANGE]`)

### Why Trendly

`[ORIGIN_PARAGRAPH — 2 to 4 sentences. Anchor in a specific incident. Avoid "I noticed that..." and "I realized..." — instead, name the trend, the date, the tool that failed, and what you wanted to exist.]`

### Approach to the build

Trendly was built in roughly 14 days of focused implementation against an amended plan. Decisions that defined the asset: credit packs over subscription (the buying motion matches the bursty content), schema-driven trend inputs (every trend is a database row rather than hardcoded form logic), and an eval gate enforced at the Postgres-trigger level (a trend cannot go live until it passes a documented eval). The full set of architectural decisions is recorded in `docs/adr/`.

### Public writing and links

- Personal site: `[PERSONAL_SITE_URL]`
- X (Twitter): `[X_HANDLE]`
- LinkedIn: `[LINKEDIN_URL]`
- GitHub: `[GITHUB_URL]`
- Newsletter: `[NEWSLETTER_URL]`

### Contact

- Press: `[PRESS_EMAIL]`
- Acquisition inquiries: `[SALE_EMAIL]`
- General: `[FOUNDER_EMAIL]`

---

## Checklist before publishing any version

Run through this list before any of the above goes live or into an outbound packet.

- [ ] `[FOUNDER_NAME]` — legal name as registered on the Wyoming LLC.
- [ ] `[PRIOR_ROLE_OR_PROJECT]` — one prior credential, verifiable on LinkedIn or a public artifact (GitHub, blog post, conference talk).
- [ ] `[PRIOR_ROLE_AND_DURATION]` — full role title + company + year range. No "currently" or "recent" — use concrete dates.
- [ ] `[ORIGIN_STORY]` — one specific moment, ideally datable. The reader should be able to picture the scene.
- [ ] `[CITY, COUNTRY]` — current residence at time of listing. Update if it changes.
- [ ] `[TOPIC]` and `[PERSONAL_SITE_OR_NEWSLETTER]` — optional, omit if there is no public writing.
- [ ] `[FOUNDER_EMAIL]` — a real, monitored inbox. Forwarding rules tested.
- [ ] `[BUILD_START_DATE]` / `[BUILD_END_DATE]` — first commit date and listing-ready date. Both verifiable from the git log.
- [ ] `[PRIOR_PROJECT_1/2]` and `[PRIOR_ROLE_1]` — be honest about shutdowns and exits. A failed prior project that you can name and analyze is a stronger credential than vague "various startups".
- [ ] `[PERSONAL_SITE_URL]`, `[X_HANDLE]`, `[LINKEDIN_URL]`, `[GITHUB_URL]`, `[NEWSLETTER_URL]` — link-check before each outbound campaign.
- [ ] `[PRESS_EMAIL]`, `[SALE_EMAIL]`, `[FOUNDER_EMAIL]` — confirm DNS, deliverability, and forwarding before sending the kit to any journalist or acquirer.
