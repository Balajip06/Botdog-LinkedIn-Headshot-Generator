# Edge Function Deploy Runbook

Canonical runbook for getting `supabase/functions/generate-image/` live and wired to the Database Webhook. Target time: < 10 minutes once `GEMINI_API_KEY` is in hand.

This is the one piece of the stack the auto-mode agent cannot ship for you — Supabase Edge Function deploys + Database Webhook creation are production writes to shared infra. The agent has done everything else; this doc finishes the loop.

Authority order on conflict: [amended plan](../../../.claude/plans/check-this-plan-c-users-balaj-projects-t-luminous-prism.md) → [`CLAUDE.md`](../CLAUDE.md) → [`RUNBOOK.md`](./RUNBOOK.md) → this file.

Project ref used throughout: `rkvhpiienwdeawqkrdxm` (from `supabase/.temp/project-ref`).

---

## 1. Pre-flight — secrets the function needs

`supabase/functions/generate-image/index.ts` reads four env vars at runtime via `Deno.env.get(...)`:

| Secret | Source | Auto-injected? | What breaks if missing |
|---|---|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/) → "Get API key" | no | `callGemini` returns `{ ok: false, reason: 'invalid', message: 'GEMINI_API_KEY missing' }`. Every generation lands on `failed_retryable`, then `failed` after 3 attempts. Quota refunded by trigger. |
| `SUPABASE_URL` | n/a | **yes** (platform-injected) | Function cannot init the supabase client. Don't set this manually. |
| `SUPABASE_SERVICE_ROLE_KEY` | n/a | **yes** (platform-injected) | Same — auth bearer check + DB writes fail. Don't set this manually. |
| `SITE_URL` | Your canonical app URL (e.g. `https://trendly.app`) | no | `dispatchNotification` silently no-ops. Generations still complete, but the push / email fallback after `status='completed'` never fires. |

Set the two manual secrets via CLI (preferred — scriptable):

```powershell
pnpm supabase secrets set GEMINI_API_KEY=AIza... --project-ref rkvhpiienwdeawqkrdxm
pnpm supabase secrets set SITE_URL=https://your-domain.com --project-ref rkvhpiienwdeawqkrdxm
```

Or by hand: Supabase Dashboard → Project Settings → **Edge Functions → Secrets** → "Add new secret" twice.

Confirm both are set:

```powershell
pnpm supabase secrets list --project-ref rkvhpiienwdeawqkrdxm
```

Expected: `GEMINI_API_KEY` and `SITE_URL` listed (values shown as `********`). `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are also listed automatically.

---

## 2. Deploy the function

```powershell
pnpm supabase functions deploy generate-image --no-verify-jwt --project-ref rkvhpiienwdeawqkrdxm
```

`--no-verify-jwt` is required because the DB webhook posts with the service-role key in `Authorization`, not a user JWT (the function does its own bearer check on line 77-80 of `index.ts`).

Expected tail of output:

```
Bundling Function: generate-image
Deploying Function: generate-image (project ref: rkvhpiienwdeawqkrdxm)
Deployed Functions on project rkvhpiienwdeawqkrdxm: generate-image
You can inspect your deployment in the Dashboard:
  https://supabase.com/dashboard/project/rkvhpiienwdeawqkrdxm/functions
```

Verify the function landed:

```powershell
pnpm supabase functions list --project-ref rkvhpiienwdeawqkrdxm
```

Expected: a row for `generate-image` with `STATUS=ACTIVE` and a recent `UPDATED_AT`.

---

## 3. Smoke test the deployed function

```powershell
pnpm smoke:edge
```

This runs `scripts/smoke-edge-function.ts`, which POSTs a synthetic `INSERT` webhook envelope (all UUIDs are zeroed) at `https://<ref>.supabase.co/functions/v1/generate-image` using `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

| Result | Meaning |
|---|---|
| `Smoke PASS — function reachable and envelope parsed.` (status 2xx OR 5xx with `trend not found`) | Deploy is live, auth works, function parsed the envelope, reached the DB, and correctly errored on the synthetic trend id. |
| `status: 401 — Unauthorized — SUPABASE_SERVICE_ROLE_KEY does not match the function secret` | Either `.env.local` has the wrong service-role key OR the platform-injected secret on the function is stale. Re-paste from Supabase Dashboard → Project Settings → API. |
| `status: 0 — network error: ...` or `timeout after 10000ms` | Function didn't deploy, project ref is wrong, or DNS is misconfigured. Re-run step 2. |
| `status: 500 — unexpected: GEMINI_API_KEY missing` | Function ran but the Gemini key secret isn't set. Re-run step 1. Smoke catches this even before a real generation. |

Curl one-liner if you'd rather skip the script:

```powershell
$body = '{"type":"INSERT","table":"generations","schema":"public","record":{"id":"00000000-0000-4000-8000-000000000000","user_id":"00000000-0000-4000-8000-000000000000","trend_id":"00000000-0000-4000-8000-000000000000","trend_version":1,"idempotency_key":"smoke-test","input_payload":{"values":{},"image_urls":[]},"status":"pending","attempts":0,"error_message":null,"model_used":null,"cost_usd":0,"output_image_url":null}}'
curl.exe -sS -X POST "https://rkvhpiienwdeawqkrdxm.supabase.co/functions/v1/generate-image" `
  -H "Authorization: Bearer $env:SUPABASE_SERVICE_ROLE_KEY" `
  -H "Content-Type: application/json" `
  -d $body
```

Expected body: `{"error":"..."}` mentioning trend not found, returned with HTTP 500.

---

## 4. Wire the Database Webhook

The function is dormant until a webhook fires it on `generations` INSERT.

1. Supabase Dashboard → **Database → Webhooks** → click **Create a new hook**.
2. Fill in:
   - **Name:** `generate-image-on-insert`
   - **Table:** `public.generations`
   - **Events:** check `Insert` only (leave Update + Delete unchecked)
   - **Type:** `HTTP Request`
   - **HTTP method:** `POST`
   - **URL:** `https://rkvhpiienwdeawqkrdxm.supabase.co/functions/v1/generate-image`
   - **HTTP Headers** (click "Add header" twice):
     - `Authorization` → `Bearer <SUPABASE_SERVICE_ROLE_KEY>` (paste the raw key after `Bearer `, no quotes)
     - `Content-Type` → `application/json`
   - **HTTP Params:** leave empty
3. Click **Create webhook**.

ASCII map of the dashboard click-path:

```
Supabase Dashboard
└── Project: trend-image-generator
    └── Database (left rail)
        └── Webhooks (sub-item)
            └── [+ Create a new hook]   ← click
                ├── Name: generate-image-on-insert
                ├── Table: public.generations
                ├── Events: [x] Insert  [ ] Update  [ ] Delete
                ├── Type: HTTP Request
                ├── URL: https://rkvhpiienwdeawqkrdxm.supabase.co/functions/v1/generate-image
                ├── Headers:
                │     Authorization → Bearer <service-role-key>
                │     Content-Type  → application/json
                └── [Confirm]   ← click
```

---

## 5. Verify end-to-end wiring

Tail the function logs in one shell:

```powershell
pnpm supabase functions logs generate-image --project-ref rkvhpiienwdeawqkrdxm
```

In a second shell, insert a real generations row via the SQL Editor (Dashboard → SQL Editor):

```sql
-- Replace <uid> with your auth.uid() — must have credits_balance >= 1 or
-- free_used_this_week < 5 or the BEFORE INSERT trigger rejects.
insert into public.generations (user_id, trend_id, trend_version, idempotency_key, input_payload)
values (
  '<uid>',
  (select id from public.trends where slug = 'ghibli-portrait'),
  1,
  'wiring-test-' || extract(epoch from now())::text,
  '{"values":{"user_photo":"https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=800"}}'::jsonb
);
```

Expected logs within 5 seconds:

```
POST | 200 | <ip> | <ms>ms | generate-image
```

Confirm the row transitioned:

```sql
select status, attempts, error_message, output_image_url
  from public.generations
 where idempotency_key like 'wiring-test-%'
 order by created_at desc
 limit 1;
```

Expected (happy path): `status='completed'`, `attempts=1`, `output_image_url` is a public URL on the `outputs` bucket.

### Top 5 failure modes + fixes

| Symptom in logs | Cause | Fix |
|---|---|---|
| `401 Unauthorized` returned to the webhook | Webhook `Authorization` header has wrong key (or `Bearer ` prefix missing) | Dashboard → Database → Webhooks → Edit `generate-image-on-insert` → re-paste service-role key with `Bearer ` prefix |
| `GEMINI_API_KEY missing` in function logs, row stuck at `failed_retryable` then `failed` | Function secret never set, or set on the wrong project ref | Re-run `pnpm supabase secrets set GEMINI_API_KEY=...` against the correct ref; redeploy is **not** required — secrets are picked up on next invocation |
| `claim failed: permission denied for table generations` | Service-role injected key is stale (regenerated in Dashboard) | Project Settings → API → "Reset service_role key" → update `.env.local` + the webhook header in lockstep |
| Function never invoked (no log lines on INSERT) | Webhook disabled, or events filter doesn't include `Insert` | Dashboard → Database → Webhooks → toggle enabled = on; verify the Events checkbox is on `Insert` |
| `Gemini 429: ...quota exceeded...`, all generations failing | Gemini free-tier daily quota burned, or billing not enabled on the GCP project | aistudio.google.com → Settings → "Enable billing" on the linked GCP project. If unblocked, the next generation completes. |

Adjacent: `upload terminal: ... bucket not found` means migration `20260528000002_storage_buckets.sql` didn't apply. Run `pnpm supabase db push --linked`.

---

## 6. Rollback

If a deploy goes wrong, the rollback is two commands + one dashboard click:

```powershell
# Delete the function (instantaneous; webhook will start receiving 404)
pnpm supabase functions delete generate-image --project-ref rkvhpiienwdeawqkrdxm

# Remove the webhook so it stops trying
# Dashboard → Database → Webhooks → generate-image-on-insert → Delete
```

Data safety: rows in `public.generations` are untouched; only the async-completion path stops working. Any rows stuck at `status='pending'` after rollback should be hard-failed by hand to refund the quota:

```sql
update public.generations
   set status = 'failed', error_message = 'edge function rolled back'
 where status = 'pending';
-- The status->failed transition fires consume_quota_on_generation_insert's
-- refund branch (migration 0003 line 88).
```

To redeploy a known-good earlier revision, `git checkout` the prior `supabase/functions/generate-image/index.ts` and re-run step 2.

---

## 7. Cost note

Two cost lines hit per generation:

- **Supabase Edge Function invocation** — Free tier includes 500k invocations/mo + 2M GB-seconds. Beyond that, ~$2/million invocations (current Supabase Pro pricing — confirm at [supabase.com/pricing](https://supabase.com/pricing) before scaling). One generation ≈ 1 invocation.
- **Gemini Nano Banana Pro** — `$0.024` per generation by default per `lib/cost/pricing.ts`-equivalent constant in `index.ts` line 64; Nano Banana v1 is `$0.0039`. Per-trend override via `trends.model` column. Cost is recorded on every `generations` row in `cost_usd` for unit-economics tracking.

See [`docs/data-room/`](./data-room/) for current ARR / cost-per-generation breakdown.

---

## 8. Linkbacks

- [`docs/RUNBOOK.md`](./RUNBOOK.md) — the 14-test verification matrix once this function is live. Tests 3, 4, 5, 8, 11 all depend on the Edge Function being deployed and the webhook being wired.
- [`docs/CREDENTIALS.md`](./CREDENTIALS.md) — full env var reference, including the Gemini section.
- [`supabase/functions/generate-image/README.md`](../supabase/functions/generate-image/README.md) — function-local README, kept in sync with this runbook.
- [`docs/sops/incident_response.md`](./sops/incident_response.md) — "Gemini quota exhausted / key revoked" playbook for the post-launch case.
