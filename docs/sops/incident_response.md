# Incident Response SOP

**Last updated:** 2026-05-29
**Owner:** Operator (solo); post-acquisition: buyer's on-call.
**Trigger:** Anything that escalates from [`docs/sops/daily_ops.md`](./daily_ops.md) "Triggers to escalate", a Sentry pager, a customer flood, or your own gut.
**Target response:** Acknowledge within 15 minutes for S0/S1. Resolve or contain within 1 hour.

This SOP operationalizes what the daily ops SOP says to escalate. Use it when something is actively breaking — not for routine bugs (those go in the issue tracker) and not for slow-burn quality issues (those go in the Sunday weekly check).

The principle: **stop the bleeding first, diagnose second, postmortem third.** A 5-minute hotfix that contains an S0 is worth more than a 2-hour proper fix that lets the incident keep running.

---

## Severity matrix

| Severity | Definition                                                                                                                        | Response time                                           | Examples                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **S0**   | Full outage, payment processing down, data exfiltration, security breach. The product is broken for everyone or money is at risk. | Acknowledge in 5 min. All hands until contained.        | `/api/generate` returns 500 for every request. Stripe webhook dropping all events. Service-role key leaked. Database wiped.  |
| **S1**   | Major feature broken affecting > 50% of users. Site is up but a critical path is dead.                                            | Acknowledge in 15 min. Contain in 1 hr.                 | Login flow fails for all Google OAuth users. Gemini key revoked, all generations failing. Push notifications totally silent. |
| **S2**   | Minor feature degraded affecting < 50%. Workaround exists.                                                                        | Acknowledge in 1 hr. Resolve same day.                  | One trend's eval gate broken. Sentry source-map upload failing. PostHog stopped capturing one event.                         |
| **S3**   | Cosmetic, docs, or a single user.                                                                                                 | Acknowledge in 1 business day. Resolve when convenient. | OG card off by 4px. A typo in the footer. One user reports a slow page.                                                      |

Default: when in doubt, declare one level higher. False alarms are cheap; missed S0s are existential.

---

## S0/S1 — Initial 15 minutes

The playbook for the first 15 minutes is fixed. Don't improvise; the order is what keeps you from going down a rabbit hole.

### Minute 0-2 — Acknowledge

1. Open Sentry → Issues. Find the alerting issue. Click **Resolve** or **Mute** on the noisy one so the pager stops firing while you work — you'll re-open if needed.
2. Open a notes file (`docs/incidents/YYYY-MM-DD-<slug>.md`) and start a timestamped log. Every action you take goes in here. This becomes the postmortem.

### Minute 2-5 — Status page banner

Trendly has no dedicated status page pre-acquisition; the banner lives in the main app via the `site_banner` row in the `site_config` table (W6 placeholder — until that ships, the banner is a hardcoded fallback in `app/(public)/layout.tsx`).

```sql
update public.site_config
   set banner_text = 'Investigating an issue with image generation. Updates here.',
       banner_severity = 'warning',
       banner_updated_at = now();
```

Banner text rules:

- Acknowledge the symptom in user-language ("image generation" not "Gemini API").
- Don't speculate on cause until you've confirmed it.
- Don't promise a fix time you can't keep.
- Update the banner as the incident progresses — silence is worse than bad news.

### Minute 5-10 — Triage source

Check these in order, stop when one fires:

1. **`/api/health`** — `curl -fsS https://<your-domain>/api/health`. If 5xx, it's an infra problem. Jump to step 2.
2. **Recent deploys** — open Vercel → Deployments. Was anything shipped in the last hour? If yes, this is the prime suspect. Roll back:
   ```bash
   vercel rollback <previous-deployment-url> --yes
   ```
   Vercel atomic deployments make this safe; rollback is instant and doesn't drop traffic.
3. **Upstream vendors** — check status pages in parallel:
   - https://status.vercel.com/
   - https://status.supabase.com/
   - https://status.stripe.com/
   - https://status.cloud.google.com/ (Gemini lives under Google Cloud → AI / ML / Vertex AI)
   - https://www.cloudflareflarestatus.com/ (Turnstile)
4. **Sentry breadcrumbs** — click into the top alerting issue. Look at the breadcrumbs leading up to the error. The breadcrumb sequence usually points to the root cause within 30 seconds.

### Minute 10-15 — Decide containment

Based on what you found, pick one of:

- **Rollback** — if a recent deploy is implicated (Vercel rollback, ~30s to restore).
- **Kill-switch trends** — if the issue is per-generation (`update public.trends set is_active = false;` — see RUNBOOK §4 kill-switch).
- **Disable a route** — if a specific route is the problem (Vercel → Project → Routes → temporarily 503 the route while you patch).
- **Wait** — if it's an upstream vendor (Stripe, Supabase, Gemini), there's nothing to fix on our side. Update the banner, refresh status pages every 5 min.

Once contained, the immediate pressure is off. Move to the diagnostic loop.

---

## Common incidents + first-action playbook

For the recurring patterns, the first action is fixed. Memorize this table.

| Incident                                                                                            | First action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Verification                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gemini quota exhausted / key revoked.** All generations failing with `429` or `403`.              | Switch to OpenAI provider: set `IMAGE_PROVIDER=openai` in Vercel env, redeploy. `lib/image-provider/index.ts` reads at runtime and routes to `./openai.ts`. **Caveat:** the OpenAI provider is a stub today; this is a "ship the real provider when this happens" line in the sand. Pre-acquisition fallback: kill-switch trends + status banner until Gemini restored.                                                                                                                                                                                                                           | Tail Edge Function logs; `provider:openai` (or no calls if kill-switched). Generations status moves from `failed_retryable` to `completed`.                              |
| **Stripe webhook backlog.** Customers paying but credits not granted.                               | Query stuck events: `select event_id, processed_at, payload->>'type' from public.webhook_events where processed_at is null order by created_at desc;`. For each stuck row, manually re-trigger via Stripe Dashboard → Developers → Webhooks → Logs → "Resend". The `event_id` UNIQUE on `webhook_events` makes resend idempotent — already-processed events no-op.                                                                                                                                                                                                                                | `select credits_balance from public.profiles where email = '<customer>'` reflects expected grant. Webhook log shows `processed_at` populated.                            |
| **pg_cron stopped firing.** Free-tier quota didn't reset Sunday, or expired generations not purged. | Check job state: `select jobname, schedule, active from cron.job order by jobname;` — all 4 should be `active=true`. If any are `active=false`, re-enable via `select cron.alter_job(jobid, active := true);`. If the jobs are missing entirely, re-run migration `20260527000005_pg_cron.sql`. Most common cause: Supabase upgrade dropped the `pg_cron` extension.                                                                                                                                                                                                                              | `select * from cron.job_run_details order by start_time desc limit 5;` shows recent successful runs.                                                                     |
| **Sentry error rate > 2% of requests.** Issues page is on fire.                                     | Triage by error fingerprint. Sentry groups errors by stack trace; the top 1-3 groups usually account for 80% of volume. Click into the top group. If the error correlates with a recent deploy timestamp, **rollback**. If it correlates with a vendor outage timestamp, **wait + banner**. If neither, **isolate the route** and patch.                                                                                                                                                                                                                                                          | Sentry error rate drops below 0.5% within 10 min of the action.                                                                                                          |
| **Refund storm.** Multiple refund requests in < 1 hour, all citing the same complaint.              | Check for fraud pattern first: `select count(*), email from public.profiles where created_at > now() - interval '2 hours' group by email having count(*) > 1;`. If many new accounts on one email pattern, it's coordinated abuse — flip Stripe Dashboard → Settings → Payments → "Pause new customer signups" while you investigate. If genuine product failure (e.g., a trend's eval missed a class of failure), kill-switch that trend (`update public.trends set is_active = false where slug = '<slug>';`) and process the refunds via [`docs/sops/refund_request.md`](./refund_request.md). | Stripe new-customer pause active; affected trend off the public catalog; refund queue drained.                                                                           |
| **Supabase outage.** Database, Auth, or Storage unreachable.                                        | Nothing to do on our side — wait for Supabase to restore. Update the banner: "Service degraded due to upstream provider — updates here". Monitor status.supabase.com. Once restored, audit `generations` table for rows stuck in `failed_retryable` during the outage and refund the affected users (the refund trigger should fire automatically on `failed` status, but verify).                                                                                                                                                                                                                | status.supabase.com green; `select count(*) from public.generations where status = 'failed_retryable' and updated_at > '<outage-start>'` returns 0 after manual retries. |

---

## Communication checklist

Every S0/S1 needs these 5 steps. Skip none.

### 1. Status page / banner — within 15 minutes

See "Minute 2-5" above. The banner is your single source of public-facing truth.

### 2. Email currently-impacted users — within 1 hour

If specific users were hit (e.g., generations failed during a Gemini outage), email them via Resend. Template below.

```
Subject: We had an issue with your Trendly generation

Hi,

Earlier today we had a brief issue with our image generation service that may have affected a generation you started. We've fixed the underlying problem and your credit has been refunded.

If your image still hasn't loaded, please reply to this email and we'll take another look.

— Trendly
```

To send to a list of impacted users, use the Resend audience API. If you don't have an audience set up, plain `to: '<comma-separated emails>'` works for batches up to 50.

### 3. Twitter/X post — within 1 hour for S0, optional for S1

Keep it short, acknowledge, give an ETA.

```
heads up: we're investigating an issue with image generation on Trendly.
working on it now — will update when resolved.
```

When resolved:

```
generation is back up. apologies for the disruption. all impacted users have been refunded.
```

Tone: matter-of-fact. Don't blame vendors publicly (it reads as deflection). Don't promise compensation publicly (it triggers a wave of "I was affected" claims).

### 4. Personal note to loudest 2-3 customer reports

If 2-3 customers emailed during the incident, reply to them by name. A two-line personal reply prevents a one-time complaint from turning into a public tweet. Template:

```
Hi <name>,

Saw your email come in during the incident — I'm really sorry. We had an issue with <vendor>'s API for about <duration>. Your credit was refunded automatically and I've added <n> goodwill credits to your account.

Reply if anything's still off.

— Balaji
```

### 5. Postmortem — within 24 hours

Open `docs/incidents/YYYY-MM-DD-<slug>.md` (you started it in minute 0-2). Fill in the template below. Even if the cause was "Supabase had an outage", write it up — buyers in diligence will ask "have you had an outage?" and a clean postmortem file is the answer.

---

## Postmortem template

```markdown
# Incident — <one-line summary>

**Date:** YYYY-MM-DD
**Duration:** HH:MM UTC start → HH:MM UTC end (<total minutes>)
**Severity:** S0 / S1 / S2
**Author:** <your name>

## Summary

<2-3 sentences describing what happened and what the user-facing impact was.>

## Timeline (all times UTC)

- HH:MM — first alert / first user report
- HH:MM — acknowledged in Sentry, banner posted
- HH:MM — root cause identified
- HH:MM — containment action taken (rollback / kill-switch / etc.)
- HH:MM — full recovery confirmed
- HH:MM — banner removed, all-clear email sent

## Root cause

<What actually went wrong. Be specific. Cite commit SHAs, env vars, vendor incidents.>

## Impact

- Users affected: <count or %>
- Generations failed: <count> (refunded: yes/no)
- Revenue impact: $<amount> in refunds + $<amount> in lost conversion (estimate)
- Data loss: yes / no (if yes, describe scope)

## What worked

<2-3 things that went well — the playbook caught X, Sentry surfaced Y in 30s, etc.>

## What didn't work

<2-3 things that should have caught this earlier. Be honest. This is the section a buyer will read.>

## Action items

- [ ] <Concrete, owned, dated. E.g.: "Add a rate-limit alert in Sentry — Balaji, by 2026-06-05">
- [ ] <Another action item, same format>

## Prevention

<One paragraph: what changes structurally so this doesn't happen again. If the answer is "nothing — this was an unpreventable vendor outage", say so.>
```

The action-items section is the one that matters for diligence. A postmortem with action items that were actually closed (`[x]`) is a strong signal; one with permanent `[ ]` items is a red flag.

---

## Recovery validation

After every S0 or S1 incident, before declaring all-clear, re-run a subset of the [`docs/RUNBOOK.md`](../RUNBOOK.md) 14-test verification matrix. Pick the tests that exercise the affected subsystem:

| Incident type              | RUNBOOK tests to re-run                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Gemini / generation outage | Test 3 (idempotency), Test 4 (retry path), Test 5 (refund on safety)                                              |
| Stripe webhook issue       | Test 12 (webhook idempotency); also `select count(*) from webhook_events where processed_at is null;` should be 0 |
| Auth / login broken        | Test 1 (RLS quota block — proves auth + RLS are wired); manual: sign in via Google OAuth + magic link             |
| Push / email broken        | Test 8 sub-cases A + B                                                                                            |
| Database / RLS issue       | Tests 1, 2, 5, 13 (full RLS + quota + soft-delete sweep)                                                          |
| pg_cron failure            | Test 10 (purges actually run)                                                                                     |
| SSR / SEO regression       | Test 9 (SSR completeness) + `curl /sitemap.xml`                                                                   |

Don't skip this step — "Sentry stopped firing" is not the same as "the bug is fixed". The 14-test matrix is the ground truth.

---

## When to wake people up

Pre-acquisition (you are solo, the operator):

- S0 → all hands, drop everything, work until contained even if it's 3am.
- S1 → work until contained or end of day, whichever comes first.
- S2 / S3 → next business day.

Post-acquisition (buyer has a team):

- S0 → page the on-call engineer + notify the buyer's CTO/founder if escalated.
- S1 → page the on-call engineer.
- S2 → assign in the issue tracker for the next business day.
- S3 → backlog.

The 30-day post-acquisition advisory window means you (the seller) are still reachable for S0 incidents that involve historical context. Buyers shouldn't be paging you for routine work — but if their on-call hits an S0 and the root cause is "something only Balaji knows", a one-time call is part of the deal.

---

## Cross-references

- [`docs/sops/daily_ops.md`](./daily_ops.md) — the "Triggers to escalate" table that lands here.
- [`docs/sops/refund_request.md`](./refund_request.md) — what to do after an incident leaves customers wanting refunds.
- [`docs/RUNBOOK.md`](../RUNBOOK.md) — the 14-test verification matrix subset for recovery validation.
- [`docs/CREDENTIALS.md`](../CREDENTIALS.md) — every external vendor + the env var that controls it (useful when an incident requires a key rotation).
- `lib/image-provider/index.ts` — the provider abstraction that makes Gemini → OpenAI failover a single env var flip (when the OpenAI provider is filled in).
- `docs/incidents/` — historical postmortems. Read these before assuming a new incident is novel; ~60% of incidents in solo-operator SaaS are recurrences of an earlier one.
