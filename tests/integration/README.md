# Integration tests

Drives a real local Postgres (the `pnpm supabase:start` stack) to exercise
triggers, RLS, and constraints that the unit suite mocks away.

## Run

```bash
pnpm supabase:start          # boots the local stack (Docker required)
pnpm supabase:reset          # applies every migration in supabase/migrations/
pnpm test:integration        # runs tests/integration/**/*.test.ts
```

These tests are excluded from `pnpm test` because they need a live DB.

Override the connection string when running against a non-default stack:

```bash
INTEGRATION_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres \
  pnpm test:integration
```

## What is covered

Every red-team trigger / RLS / constraint added in the 2026-05-30 audit:

| Spec                           | Surface                                                                                                                                    | Red-team ref          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `quota-trigger.test.ts`        | `consume_quota_on_generation_insert` — credit/free/vip branches, tier snapshot, exhaustion+quota_blocked, concurrent race under FOR UPDATE | non-negotiable #1, C2 |
| `profiles-self-update.test.ts` | `profiles_self_update` column allowlist + soft-delete monotonicity                                                                         | C1                    |
| `anonymous-attempts.test.ts`   | per-field UNIQUE on fingerprint_hash + ip_hash                                                                                             | C3                    |
| `eval-proof.test.ts`           | `require_eval_proof_for_passed` — passed needs a matching `trend_eval_runs` row at current version                                         | H5                    |
| `admin-audit-triggers.test.ts` | `audit_trends_changes` + `audit_profiles_vip_changes` — captures auth.uid() OR app.admin_actor GUC                                         | C4                    |
| `referral-ledger.test.ts`      | `referral_rewards` ledger blocks delete+recreate farming                                                                                   | M6                    |
| `refund-by-tier.test.ts`       | `refund_quota_on_failure` uses `tier_at_generation` snapshot                                                                               | L2                    |
| `webhook-dedup.test.ts`        | `webhook_events` UNIQUE (source, event_id) + source CHECK + partial idx                                                                    | non-negotiable #9     |

## What is NOT covered yet

- pg_cron job execution paths (the wrapper functions are pure SQL, but
  testing the schedule requires either time travel or fixture rows that
  the cron picks up — defer until pg_cron exposes a deterministic
  run-now helper or use Supabase's `cron.schedule_in_database`).
- Storage RLS policies (`outputs/eval/*` private — M7). The Storage
  policy engine isn't reachable via the postgres client; needs a
  supabase-js test that exchanges anon vs service-role JWTs.
- Stripe webhook handler — the route logic itself (signature check,
  dedup-on-23505, sentry on processed_at fail) is exercised at the HTTP
  layer, not the SQL layer. Add a route-level test against a mock
  `service-role + httpMocks request` instead.

## CI

These tests should run on a workflow that boots Supabase in a service
container. Suggested job step:

```yaml
- uses: supabase/setup-cli@v1
- run: supabase start
- run: supabase db reset
- run: pnpm test:integration
```

Until that lands, run locally before any PR that touches a migration.
