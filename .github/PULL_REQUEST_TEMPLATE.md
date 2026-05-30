## What changed

<!-- 1-2 sentences. What does this PR do? -->

## Why

<!-- Link to issue, the runbook step, the SOP, or the user request. -->

## Verification

<!-- How did you verify this works? -->

- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test` passing
- [ ] `pnpm build` clean
- [ ] (If schema change) `pnpm supabase:reset` applies cleanly
- [ ] (If new admin route) audit-logged via `logAdminAction`
- [ ] (If new public route) `dynamic` + `revalidate` set appropriately

## Screenshots / notes

<!-- Optional. UI changes → before/after. -->

## Rollback plan

<!-- How would we undo this if it broke production? -->

---

Reviewer: please confirm the trigger / migration / audit story makes sense before merging.
