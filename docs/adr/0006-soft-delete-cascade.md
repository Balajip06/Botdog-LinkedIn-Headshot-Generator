# ADR 6: Soft-delete via `profiles.deleted_at` with 30-day pg_cron purge

Date: 2026-05-29
Status: Accepted

## Context

GDPR Article 17 (right to erasure) requires that users be able to delete their account and have their personal data removed. Stripe's chargeback policy gives a 120-day window for disputes. Refund operations frequently need to look back 30 days after a purchase.

A naive `DELETE FROM profiles WHERE id = $user_id` cascade would:
- Lose the audit trail required for chargeback defense (which `generations` belonged to whom, what they cost, what we charged).
- Make legitimate refunds impossible after deletion (can't credit a deleted account).
- Cascade-delete `generations` immediately, leaving Stripe webhook events orphaned and unrefundable.

Conversely, holding data forever:
- Violates GDPR if the user requested deletion.
- Inflates the Storage bill (the output PNGs are the largest line item per generation).
- Creates a wider data footprint than necessary in a security incident.

## Decision

Two-phase delete:

**Phase 1 — Immediate soft-delete (synchronous on user request).**
[app/api/me/delete/route.ts](../../app/api/me/delete/route.ts) (or whatever the GDPR delete endpoint is) sets `profiles.deleted_at = now()`. Related rows (`generations`, `referrals`, `webhook_events`) stay in place but become invisible to the user via RLS:

- `profiles_self_read` policy filters `deleted_at IS NULL`.
- `generations_self_read` policy joins to `profiles` and applies the same filter.
- Public surfaces (`/result/[id]`, `/trend/[slug]`) don't display anything from deleted users' generations.

Within 24 hours of soft-delete, the user effectively disappears from every public + authenticated surface.

**Phase 2 — Hard purge (pg_cron, daily 02:00 UTC, runs 30 days after soft-delete).**
[supabase/migrations/20260527000005_pg_cron.sql](../../supabase/migrations/20260527000005_pg_cron.sql) defines:

```sql
delete from public.profiles
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
```

The cascade through foreign keys (`generations.user_id REFERENCES profiles(id) ON DELETE CASCADE`) cleans up Generations + Anonymous attempts + Referrals + Push subscriptions atomically. Storage objects are cleaned up by a separate purge function that walks Storage and matches against deleted `user_id`s.

## Consequences

**Positive:**
- GDPR-compliant 30-day SLA on hard erasure (well inside the GDPR-required "without undue delay" + reasonable industry interpretation of ~30 days).
- Stripe refund window stays operational for the full 30 days after soft-delete — refund liabilities outlive the user's "deleted" status but not forever.
- Audit log (`admin_audit_log`) is *not* affected by the cascade — admin actions remain attributable for compliance. Documented in [supabase/migrations/20260527000004_ancillary.sql](../../supabase/migrations/20260527000004_ancillary.sql).
- A user who deletes-then-regrets has 30 days to reverse via support (manual SQL to clear `deleted_at`). Hard delete would have made this impossible.

**Negative:**
- Application code must remember to filter `deleted_at IS NULL` everywhere. RLS handles the SELECT path; UPDATE/INSERT from server-side code (service role) bypasses RLS and has to apply the filter manually. Easy to miss in a new endpoint.
- 30 days of data hanging around is a wider security footprint than zero days. Mitigated by RLS (no public-facing access).
- pg_cron must be running. If the cron job silently fails, soft-deleted users accumulate indefinitely. Mitigation: [docs/sops/daily_ops.md](../sops/daily_ops.md) calls out the weekly pg_cron status check.

## Alternatives considered

**Immediate hard delete on user request.** Rejected: loses chargeback defense, makes refunds impossible, complicates accounting.

**Soft-delete with no automatic purge (manual review every 30 days).** Rejected: requires standing operator attention. The whole point of pg_cron is to make this hands-off.

**Soft-delete forever (no purge).** Rejected: GDPR violation, indefinitely growing Storage costs, unbounded incident blast radius.

**Anonymize-in-place (set email to a hash, keep rows).** Rejected: still a wider data footprint than zero. GDPR jurisprudence on "anonymized" vs "deleted" is unsettled enough that diligence-grade compliance argues for actual deletion.
