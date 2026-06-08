# Contributing to Botdog

Botdog is a proprietary solo project today. This document still exists for two reasons: (1) so a new owner inheriting the codebase can ramp without re-deriving the conventions, and (2) so any future invited contributor has a fixed-target process to follow.

If you're reading this as a buyer's engineering lead — start with [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the system map, then come back here for the working process.

---

## Who can contribute

Botdog is currently solo (founder + sole maintainer). External pull requests are not accepted at this time. Future contributors will be invited by the project owner — if that's you, this document is the entry checklist.

The `LICENSE` file is the binding constraint: this code is proprietary, no fork-and-PR workflow exists, and any contribution made by an invited collaborator is governed by a separate written contributor agreement signed before the first commit.

---

## Setup

See the [Quick start](./README.md#quick-start) section of the README. Briefly:

```bash
pnpm install
cp .env.local.example .env.local          # fill values per docs/CREDENTIALS.md
pnpm supabase start                       # local Supabase (Docker required)
pnpm supabase:reset                       # apply migrations + seed
pnpm dev
```

`pnpm` is the only supported package manager — see the README for why.

---

## Branch + commit conventions

- **`main`** is the deploy branch. Vercel auto-deploys every push to `main` to production. Force-pushes to `main` are forbidden.
- **Feature branches** are named `feat/<short-slug>`, `fix/<short-slug>`, `chore/<short-slug>`, `docs/<short-slug>`, `test/<short-slug>`, or `refactor/<short-slug>`. Lower-case, hyphens, no spaces.
- **Conventional commits** are mandatory: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`. The subject line stays under 72 characters. A body explaining the "why" is encouraged for non-trivial changes — the "what" is in the diff.
- One logical change per commit. Don't bundle a feature with an unrelated refactor; reviewers split the diff in their head either way.
- Squash on merge is the default; rebase merges are allowed for clean linear history.

Example:

```
feat: add VIP flag to profile + admin gate

VIP users bypass the weekly-5 free-tier quota but still consume Stripe credits
when their balance is non-zero. Surface in the admin user list + the audit log
when the flag flips. Backed by migration 20260529000006_profiles_vip.sql.
```

---

## Pull requests

- Every change goes through a pull request — no direct pushes to `main`.
- The PR template at [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md) auto-populates the description; fill every section.
- PRs require **green CI** (typecheck + lint + test + build) before merge. The `ci.yml` workflow runs all four gates.
- PRs require **a reviewer approval**. Solo project means the founder self-approves after a structured self-review pass; invited contributors require founder approval.
- PR titles follow the same conventional-commit format as commits.
- Link the relevant issue (`Closes #N`) or the ADR / SOP that motivated the change.
- Screenshots required for any UI change — drop them in the PR description, not as PR comments.

---

## Issue triage

Bugs and feature requests live on GitHub Issues with one of these labels:

- **`bug`** — something is broken; use [`.github/ISSUE_TEMPLATE/bug.md`](./.github/ISSUE_TEMPLATE/bug.md)
- **`trend-suggestion`** — a user-submitted trend idea; use [`.github/ISSUE_TEMPLATE/trend_suggestion.md`](./.github/ISSUE_TEMPLATE/trend_suggestion.md). These also land in the in-app `/admin/suggestions` inbox.
- **`enhancement`** — non-bug improvement
- **`docs`** — documentation-only fix
- **`good first issue`** — scoped tightly enough for a new contributor to take

Refund disputes, IP takedown requests, and security reports do **not** go on GitHub. The issue template config at [`.github/ISSUE_TEMPLATE/config.yml`](./.github/ISSUE_TEMPLATE/config.yml) redirects these to the correct off-GitHub channels:

- Refund requests → the SOP at [`docs/sops/refund_request.md`](./docs/sops/refund_request.md)
- IP takedown requests → the SOP at [`docs/sops/takedown.md`](./docs/sops/takedown.md)
- Security reports → [`SECURITY.md`](./SECURITY.md)

---

## Code style

- **Prettier auto-format on save.** The repo ships a `.prettierrc` with the tailwind plugin enabled. Editor-local config decides save-on-format behavior; CI runs `pnpm format:check`.
- **ESLint flat config** at [`eslint.config.mjs`](./eslint.config.mjs). `pnpm lint` is the gate. No warnings tolerated in CI for changed files.
- **TypeScript strict.** `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, zero `any`. If you genuinely need an escape hatch, use `unknown` + a Zod parse boundary, not `any`.
- **Karpathy guardrails** (from [`CLAUDE.md`](./CLAUDE.md)):
  1. Think before coding — state assumptions, surface alternates, stop if unclear
  2. Simplicity first — minimum code, no speculative abstractions
  3. **Surgical changes** — every line traces directly to the request; don't refactor adjacent code
  4. Goal-driven — convert tasks into verifiable goals before writing code
- **Immutability** — return new objects, never mutate. This is global, including state stores and Supabase responses.
- **File size** — ≤800 lines per file, ≤50 lines per function, ≤4 levels of nesting. If you blow past these, extract.
- **Naming** — `camelCase` for variables and functions, `PascalCase` for types and components, `UPPER_SNAKE_CASE` for constants, `useFoo` prefix for hooks, `is/has/should/can` prefix for booleans.

---

## Tests

- **Vitest** is the unit + component test runner. `pnpm test` runs the full suite; `pnpm test:watch` is the dev loop.
- **Playwright** is the E2E runner across chromium / webkit / mobile-chrome / mobile-safari projects. `pnpm test:e2e` is the gate.
- **AAA pattern** (Arrange / Act / Assert) per the global testing convention in `~/.claude/rules/common/testing.md`.
- **Test naming** describes the behavior under test, not the function name. `returns empty array when no trends match query` beats `test getTrends`.
- **Coverage minimum** — 80% across new code. The full suite currently sits at 404 passing across 43 files; new features must not drop the percentage.
- **New features need tests.** This is enforced in the PR template and the reviewer checklist.
- **Bug fixes need a regression test.** Write the failing test first (RED), make it pass (GREEN), then refactor (IMPROVE).

---

## Migration discipline

Schema changes are the single most fragile part of the codebase. The discipline is non-negotiable:

1. Every schema change is its own timestamped migration file in [`supabase/migrations/`](./supabase/migrations/). Filename format: `YYYYMMDDhhmmss_short_description.sql`.
2. New migrations are **forward-only**. Never edit a migration after it has been applied to a live database — write a new migration that supersedes it.
3. Run `pnpm supabase:reset` locally to validate the full migration chain end-to-end before opening a PR. This applies every migration from zero against a fresh database.
4. Regenerate `lib/supabase/database.types.ts` with `pnpm supabase:types` after every schema change. Commit the regenerated types in the **same PR** as the migration that motivated them — never separate.
5. Every migration must declare its **RLS posture**: either it adds policies, or it documents (in a top-of-file comment) why the table doesn't need them.
6. Triggers + RLS policies are migration territory, not application code. The audit-log trigger, the quota-block trigger, and the eval-gate constraint all live in migrations 0002 / 0009 / 0002 respectively — don't move them up the stack.

See [`docs/adr/0002-rls-quota-strategy.md`](./docs/adr/0002-rls-quota-strategy.md) and [`docs/adr/0004-eval-gate-constraint.md`](./docs/adr/0004-eval-gate-constraint.md) for the architectural reasoning behind the most load-bearing migrations.

---

## Admin actions

Every admin write must go through `lib/admin/audit.ts` `logAdminAction()`. Bypassing this helper is a review blocker — full stop. The audit log is the single source of truth for "who did what when" and is surfaced both in `/admin/audit` and in the buyer's data room.

A correct admin write looks like:

```ts
await logAdminAction({
  action: 'trend.deactivate',
  target_id: trend.id,
  diff: { is_active: { before: true, after: false } },
})
```

The helper resolves the actor from the request context, stamps the timestamp, and writes via service-role. If you're tempted to skip it because "this admin action is internal", that's the exact action that needs audit coverage.

---

## What to do, what not to do

**DO:**

- Pull latest `main` before starting any branch
- Run all four local gates (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`) before opening a PR
- Write tests before features; write a regression test before fixing a bug
- Use the global skills from `CLAUDE.md` proactively (especially `superpowers:brainstorming` before new features and `superpowers:test-driven-development` for new code)
- Document every load-bearing decision as an ADR in `docs/adr/`
- Add a session entry to `.claude/session-log.md` at the end of a working session
- Capture corrections in `.claude/lessons.md` the same turn they happen

**DON'T:**

- Hardcode secrets — env vars only, validated via the Zod schema in `lib/env.ts`
- Skip the audit helper for admin actions
- Bypass RLS without an explicit justification documented in the PR description and reviewed by the founder
- Add new dependencies without justifying them — every npm dep is a supply-chain risk; prefer first-party code under 50 lines, prefer well-maintained battle-tested libraries when the line count exceeds that
- Edit a migration that has been applied to a live database — write a new one
- Mark a task `[x]` in `.claude/todo.md` without proof of verification (tests pass, logs clean, behavior demonstrated)
- Force-push to `main`
- Commit with `--no-verify` or skip pre-commit hooks

---

## Reviewing a pull request

When reviewing a PR (self-review counts), the reviewer must check:

1. **Conventional commit format** — title + each commit subject
2. **CI is green** — typecheck + lint + test + build all pass
3. **Tests exist for new behavior** — and they actually exercise the new code path (look at the diff coverage, not the total)
4. **Migration discipline** — if `supabase/migrations/` has a new file, `lib/supabase/database.types.ts` must be regenerated in the same PR
5. **Audit log discipline** — if `/admin/*` code is touched, `logAdminAction()` is called appropriately
6. **RLS posture** — if a new table is added, its RLS policies are present in the same migration
7. **Surgical scope** — the diff doesn't include drive-by refactors or formatting churn unrelated to the stated change
8. **Security checklist** — for any auth / payment / user-data change, the [`SECURITY.md`](./SECURITY.md) "measures already in place" section is not regressed
9. **Documentation** — if the change alters an architectural decision, an ADR is added; if it changes operational behavior, the relevant SOP in `docs/sops/` is updated
10. **Session log + lessons** — `.claude/session-log.md` and `.claude/lessons.md` reflect the change

The PR template's reviewer checklist mirrors this list. Tick every box or explicitly note why it doesn't apply.

---

## Questions

If anything in this document is ambiguous or contradicts something you read elsewhere in the repo, the order of precedence is:

1. [`CLAUDE.md`](./CLAUDE.md) — the AI-agent-oriented project instructions (most precise on conventions)
2. [`docs/adr/`](./docs/adr/) — load-bearing architectural decisions (most precise on "why")
3. This document
4. The amended plan referenced in `CLAUDE.md`

Open an issue with the `docs` label if a real conflict surfaces — drift between documents is a bug.
