# ADR 4: `is_active = true` requires `eval_status = 'passed'` enforced at the DB layer

Date: 2026-05-29
Status: Accepted

## Context

Trends ship in three lifecycle states:

- **draft**: `is_active = false`, `eval_status = 'untested'` — admin is composing the prompt.
- **failed eval**: `eval_status = 'failed'` — Gemini eval surfaced safety blocks or quality failures.
- **live**: `is_active = true`, `eval_status = 'passed'` — visible to the public.

A trend going live without passing eval is the worst-case content shipping failure:

- A bad prompt (e.g., one that triggers Gemini safety on most inputs) wastes user credits.
- A franchise-IP-grey-area prompt (see [docs/TREND_BANLIST.md](../TREND_BANLIST.md) and ADR comments) reaches users without operator review.
- A poorly-rated trend dilutes the catalog's average quality and tanks repeat-purchase rate — directly hits the diligence KPI.

The risk: every UPDATE statement that touches `is_active` is a potential trapdoor. Admin form actions ([app/admin/trends/actions.ts](../../app/admin/trends/actions.ts)) check before write, but a future admin route, an SQL console session during incident response, or a misclicked toggle all bypass that check.

## Decision

A **check constraint plus a BEFORE-UPDATE trigger** on `public.trends` enforces the invariant (see [supabase/migrations/20260527000002_trends.sql](../../supabase/migrations/20260527000002_trends.sql)).

Trigger logic on UPDATE:

1. If `NEW.is_active = true AND NEW.eval_status != 'passed'`, RAISE `'eval gate: trend must pass eval before activation'`.
2. If `NEW.prompt_template != OLD.prompt_template`, automatically set `NEW.eval_status = 'untested'` and `NEW.is_active = false`. (Prompt edits invalidate prior eval results.)

The second clause was added after an incident on 2026-05-29 where an admin shipped a prompt edit + `is_active=true` flip in the same form save, bypassing the operator's intuitive expectation that "edited prompts re-eval." See the lessons log entry on the same date.

[app/admin/trends/[id]/eval/page.tsx](../../app/admin/trends/[id]/eval/page.tsx) is the operator UX for running evals; the trigger backstops it.

## Consequences

**Positive:**

- Impossible to ship a non-evaluated trend via _any_ path (admin UI, SQL console, future API).
- Prompt edits auto-reset eval state — operator can't accidentally re-activate stale-eval'd trends.
- Diligence: a buyer can query `select id, slug from trends where is_active = true and eval_status != 'passed';` and confirm zero rows. The constraint guarantees this is always empty.

**Negative:**

- Bulk admin operations (e.g., "deactivate all trends for franchise-IP review") still work, but bulk re-activate requires re-eval of every touched trend. Annoying during incident response.
- The trigger raises a Postgres exception; [app/admin/trends/actions.ts](../../app/admin/trends/actions.ts) has to translate it to a user-facing form error. One more error path to maintain.
- A one-time SQL bypass exists during migration scripts. Documented in the project lessons log; reserved for emergency-only.

## Alternatives considered

**App-layer check only (in `actions.ts`).** Rejected: every new write path = new place to forget. Same class of bug as ADR 2.

**No automatic eval-reset on prompt change; require operator to manually toggle.** Rejected: the 2026-05-29 incident proved operators can and do forget. Eight prompts shipped active that needed re-eval.

**Allow `is_active = true` with `eval_status = 'untested'` and use a separate `eval_passed` flag.** Rejected: doubles the state model for marginal flexibility. Trend lifecycle is genuinely sequential; the constraint fits.
