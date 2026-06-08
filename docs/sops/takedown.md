# Takedown SOP

**Last updated:** 2026-05-29
**Trigger:** Inbound email to `legal@<domain>` from a rights holder, their counsel, or a third-party reporting infringement.
**Target response time:** Acknowledge within 24 hours. Remove offending content within 48 hours.
**Authority:** Operationalizes [`docs/TERMS_OF_SERVICE.md`](../TERMS_OF_SERVICE.md) §4 (style references + takedown protocol).

> Note: Botdog is now a single-purpose LinkedIn-headshot tool; the multi-trend / franchise-IP workflow below is retained for historical context / potential future multi-style expansion.

Botdog operates a curated trend catalog. Most takedown emails will target either (a) a specific user-generated output that the rights holder believes infringes, or (b) the underlying trend prompt itself (e.g., "your 'Ghibli-style' trend infringes Studio Ghibli's trade dress"). The branching is critical — the response differs significantly.

---

## Operating principle

Good-faith takedown without admission of liability. Botdog's TOS §4 commits to:

1. Remove the affected trend within 24 hours.
2. Re-prompt the trend to drop the named reference.
3. Notify users who generated under that trend.

This SOP delivers that commitment without escalating the case beyond what the rights holder asked for. **Do not concede infringement in writing.** Do not commit to monetary remediation without a lawyer. Do not engage on substance — your role is operational compliance, not legal argument.

---

## Step 1 — Identify the offending content

Read the inbound email carefully. The rights holder usually includes one of:

- A direct URL: `/result/<id>` or `/anonymous/<id>` or `/trend/<slug>`.
- A description of the trend by name: e.g., "your Ghibli-style trend."
- A screenshot with a visible watermark including the generation ID (watermark format is `botdog-headshot.vercel.app/r/<short_id>`).

**If they provided a URL** — parse the ID:

```sql
-- For /result/<id> or /anonymous/<id>:
select id, user_id, trend_id, status, output_image_url, is_public, deleted_at, created_at
  from public.generations
 where id = '<generation_id>';

-- Or, if anonymous:
select id, fingerprint_hash, trend_id, output_image_url, created_at
  from public.anonymous_attempts
 where id = '<attempt_id>';

-- For /trend/<slug>:
select id, slug, title, prompt_template, is_active, eval_status
  from public.trends
 where slug = '<slug>';
```

**If they described the trend by name**:

```sql
select id, slug, title, prompt_template, is_active
  from public.trends
 where title ilike '%<keyword>%'
    or slug ilike '%<keyword>%'
    or prompt_template ilike '%<keyword>%';
```

Cast a wide net — the rights holder may use a colloquial name for the trend that doesn't match the title. Compare prompts manually.

**If they provided a screenshot only** — parse the watermark text. Output watermarks include a short ID. Resolve via the URL-shortener mapping (if implemented W7) or by full-table scan on `generations.output_image_url`.

---

## Step 2 — Triage the claim

Decide which branch applies. The same takedown can sometimes touch both — handle as 3a **and** 3b.

| Claim shape                                                                                                           | Branch                                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| "This specific user generation infringes." (e.g., a screenshot with a specific user's face + a copyrighted character) | **3a — User generation**                                                                    |
| "Your trend concept itself infringes." (e.g., "the 'Ghibli-style' trend is an unauthorized derivative work")          | **3b — Trend concept**                                                                      |
| "Both" (the trend produces infringing outputs at scale, and here are examples)                                        | **3a + 3b**                                                                                 |
| "Right of publicity" — a specific person (often a celebrity) claims their likeness is being used                      | **3b** (deactivate any trend that names them) + **3a** (delete any user-gen of that person) |
| DMCA notice with full statutory elements                                                                              | Treat as **3a** + **3b**, follow safe-harbor process below                                  |

---

## Step 3a — User generation takedown

Soft-delete the offending generation. We use soft-delete (not hard-delete) for 30 days so we can restore on a successful counter-notice (see step 5).

```sql
-- Authenticated user generation
update public.generations
   set deleted_at = now(),
       is_public  = false
 where id = '<generation_id>';

-- Anonymous trial generation
update public.anonymous_attempts
   set output_image_url = null  -- hide URL but keep row for dedup
 where id = '<attempt_id>';
```

For anonymous attempts we null the URL rather than soft-delete — the row's `(fingerprint_hash, ip_hash)` UNIQUE constraint must remain enforced (see migration `20260527000004_ancillary.sql`).

**Also delete the storage object** (the SQL above only kills the row; the file in Supabase Storage `outputs/` is what the rights holder actually wants gone):

```bash
# Via Supabase CLI:
pnpm supabase storage rm --linked outputs/<path>

# Or via the Storage explorer in the Supabase dashboard:
# Storage → outputs → find the file → delete.
```

If the URL is publicly cached anywhere (CDN, archive.org, screenshotted on Twitter, etc.) — you can only control the canonical URL. Note this in the reply to the rights holder.

**Notify the affected user** (templated below). If the user is anonymous, this step is skipped — there is no email on file. Document this in the takedown log row.

---

## Step 3b — Trend concept takedown

Deactivate the trend at the catalog level. Use `/admin/trends/[id]/edit` to flip `is_active = false`. This:

- Removes the trend from the public catalog (RLS policy `trends_public_read` requires `is_active = true`).
- Removes the SSR `/trend/<slug>` page from the sitemap (`app/(public)/sitemap.ts` reads only active trends).
- Stops new generations against this trend (the `/api/generate` route validates the trend is active before queuing).

Existing generations from this trend are **not** automatically deleted — historical user content is the user's, per TOS §5. If the rights holder demands deletion of all outputs from this trend, do step 3a for each one. This is a large operation:

```sql
-- Find all user generations from the trend:
select id, user_id, created_at, output_image_url
  from public.generations
 where trend_id = '<trend_id>'
   and status   = 'completed'
   and deleted_at is null;

-- Bulk soft-delete (only if the rights holder explicitly demanded all outputs):
update public.generations
   set deleted_at = now(),
       is_public  = false
 where trend_id = '<trend_id>'
   and deleted_at is null;
```

Add the offending name (the studio, franchise, or celebrity) to [`docs/TREND_BANLIST.md`](../TREND_BANLIST.md). Future trends must not reference that name.

If you want to keep the trend's _aesthetic_ (which is often what made it popular) — re-prompt it to drop the named reference. Per TOS §4 point 2, this is the committed remediation. Example: a Ghibli-styled trend gets re-prompted to "soft hand-drawn 1990s animation aesthetic with pastel skies." Open `/admin/trends/[id]/edit`, edit `prompt_template`, save. The `bump_trend_version` trigger (migration `20260527000002_trends.sql`) will:

- Bump `version`.
- Append the old prompt to `prompt_template_history`.
- Flip `eval_status = 'untested'` + `is_active = false` (the eval gate).

The trend stays inactive until you re-run the eval at `/admin/trends/[id]/eval`. **Do not skip the eval step** — the eval gate constraint in migration 0002 will reject the re-activation otherwise.

---

## Step 4 — Log the case

Create a per-case file in `docs/takedowns/`. Filename: `YYYY-MM-DD-<rightsholder-slug>.md`.

Template:

```markdown
# Takedown — <rights holder name>

**Date received:** YYYY-MM-DD
**Channel:** legal@<domain> / certified mail / DMCA agent / other
**Rights holder:** <name>
**Counsel (if applicable):** <firm + attorney name>
**Claim summary:** <one-paragraph description of what was claimed>

## Action taken

- [ ] Step 1: identified affected content. IDs: <list>
- [ ] Step 2: triaged. Branch: 3a / 3b / both.
- [ ] Step 3a: soft-deleted generations (list of `generations.id`).
- [ ] Step 3b: deactivated trend `<slug>` (`trends.id = <id>`).
- [ ] Re-prompted? Yes/No. New prompt version: <n>.
- [ ] Storage objects deleted: <list of paths>.
- [ ] Affected users notified: <count> / <list of user_ids>.
- [ ] Banlist updated: docs/TREND_BANLIST.md commit <sha>.

## Correspondence

- YYYY-MM-DD HH:MM — inbound email summary
- YYYY-MM-DD HH:MM — outbound acknowledgement (template A)
- YYYY-MM-DD HH:MM — outbound confirmation (template B)

## Resolution

<one-paragraph summary of how the case closed — rights holder accepted, escalated, etc.>
```

This log is the artifact that survives an acquisition. A holdco buyer will ask "have you ever received a takedown?" and the answer needs to be one of (a) "no", (b) "yes, here are the case files showing we handled it cleanly". The second answer is acceptable. The third — "yes, but I didn't keep records" — is a red flag during diligence.

---

## Step 5 — Counter-notice handling

Botdog does not adjudicate disputes between rights holders and users. Per TOS §4, the takedown is final from Botdog's side — Botdog's role ends after good-faith removal.

If the affected user disputes the takedown:

1. Direct them to escalate via legal channels (their own counsel) directly to the rights holder.
2. Do **not** restore the content unilaterally based on user assertion.
3. Restore only if the rights holder retracts in writing, **or** if a court order directs restoration.

For DMCA-specific notices, the safe-harbor process is more structured:

- A valid DMCA notice includes: identification of the work, identification of the infringing material, contact info, good-faith statement, accuracy statement under penalty of perjury, physical/electronic signature.
- If a notice lacks any element, you may request the missing elements before acting (but err on the side of acting in good faith — incomplete notices still trigger removal, just not safe harbor).
- A DMCA counter-notice (from the user, with the same statutory elements) triggers a 10-14 business day waiting period before restoration. If the rights holder files suit during that window, content stays down indefinitely.

DMCA is US-law specific. For non-US rights holders, follow the same procedural skeleton but be aware the statutory hooks differ.

---

## Templated replies

### Template A — Acknowledgement to rights holder (send within 24h)

```
Subject: Re: takedown request — Botdog

Hi <name>,

Thank you for reaching out. We've received your request and are reviewing the affected content now.

We expect to have the offending content removed within 48 hours of your email. We'll follow up once removal is confirmed.

For our records, could you confirm:
- The specific URL(s) or generation ID(s) involved
- The work or right you're asserting (registered trademark, copyright registration, right of publicity, etc.)
- Your authority to act on the rights holder's behalf

This is purely for our internal documentation and does not delay the takedown.

— Botdog
```

### Template B — Confirmation of removal to rights holder

```
Subject: Re: takedown request — content removed

Hi <name>,

Confirming the requested content has been removed:

- <Generation ID(s) or trend slug(s)> — removed at <UTC timestamp>
- Trend re-prompted to drop the referenced name: yes / no
- Affected users notified: yes / no (n=<count>)

The trend has been added to our internal banlist so future curation will avoid referencing <name>.

If you have additional URLs or believe related content remains, please reply with details and we'll handle them under the same case.

— Botdog
```

### Template C — Notification to affected user

```
Subject: A generation has been removed from your Botdog account

Hi <name>,

We received a takedown request from <rights holder> regarding a generation in your account from <date> on the "<trend title>" trend. Per our Terms (§4), we've removed the generation.

Your account is in good standing — this is not a strike against you, and your credits / Pro status are unaffected. The trend itself may have been retired or re-prompted; if you used a similar trend in the past, your other generations are unaffected.

If you believe this was in error and want to dispute the takedown directly with <rights holder>, you'd need to do so through your own legal channels. Botdog's role here is operational — we honor good-faith takedowns from rights holders.

Questions about your account: reply to this email.

— Botdog
```

### Template D — Holding reply (when you need more time)

```
Subject: Re: takedown request — Botdog

Hi <name>,

Confirming we received your request. We're investigating the specific generations involved and want to be sure we remove the right content (rather than overreaching and removing unaffected user output).

You'll hear back from us within 48 hours of your original email with confirmation of removal.

— Botdog
```

---

## When to involve a lawyer

The default posture is operational compliance without engaging counsel. Lawyer up if **any** of these are true:

- **Monetary damages claimed.** "Pay us $X in damages" is a separate matter from takedown. Do not respond on damages without counsel.
- **Class action threat or pattern.** If the same email cites multiple users / trends / dates suggesting a systemic claim, you need counsel.
- **Novel claim type.** Right-of-publicity in an unfamiliar jurisdiction, AI-training-data infringement, trade-secret claims — all novel. Defer to counsel.
- **Counter-notice escalates.** If the affected user retains counsel and asserts wrongful takedown, you need your own counsel.
- **DMCA misrepresentation suspicion.** If the takedown looks frivolous (competitor sending fake DMCA, etc.), counter-notice procedure protects you, but a lawyer should review the response.
- **Subpoena, court order, or government request.** Stop and call a lawyer before responding.
- **The rights holder is named in TOS §4** (Disney, Studio Ghibli, Pixar, etc.) and the claim is substantive (not just a cease-and-desist). Big rights holders test their playbook on small operators; getting counsel involved early avoids a default judgment scenario.

Pre-acquisition, your "counsel" is whoever you've retained for the asset sale. They will not handle IP takedowns but they can refer you to an IP litigator on short notice. Post-acquisition, the buyer assumes legal exposure under the asset purchase agreement.

---

## DMCA safe-harbor logic (US, summary)

Botdog is a "service provider" under 17 U.S.C. §512 if all of these hold:

- We don't have actual knowledge of infringement.
- We don't financially benefit directly from infringement (gray area — we sell credits; the trend catalog is curated by us).
- We respond expeditiously to takedown notices.
- We designate an agent for receipt of notices.

To preserve safe harbor:

- Designate a DMCA agent via the [USCO online portal](https://dmca.copyright.gov/) ($6/3-year filing). Listed agent email is `legal@<domain>`. **TODO — file before public launch.**
- Publish the agent's contact info on the site (footer link to a `/dmca` page).
- Implement a repeat-infringer policy: users with 3+ valid takedowns get suspended.

The DMCA agent designation is cheap, fast, and dramatically reduces exposure. Do it before launch.

---

## Cross-references

- [`docs/TERMS_OF_SERVICE.md`](../TERMS_OF_SERVICE.md) §3 (personal-use only) + §4 (takedown protocol).
- [`docs/TREND_BANLIST.md`](../TREND_BANLIST.md) — names that must not appear in trend prompts.
- [`docs/sops/daily_ops.md`](./daily_ops.md) → "Customer emails `legal@`" escalation row.
- Migration `supabase/migrations/20260527000002_trends.sql` — `is_active`, `eval_status`, `prompt_template_history`, `bump_trend_version` trigger.
- Migration `supabase/migrations/20260527000003_generations.sql` — `deleted_at`, `is_public`.
