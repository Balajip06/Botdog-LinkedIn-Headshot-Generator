# Lessons — Corrections + Patterns

Append on EVERY user correction. Review at session start.

Format:
```
## YYYY-MM-DD — short title
**Trigger:** what user corrected
**Lesson:** what to do differently
**Apply when:** scope of rule
```

---

## 2026-05-27 — Track plan + session state on disk

**Trigger:** User flagged session tracker missing; plan being lost between sessions. Referenced KIMP project as template.
**Lesson:** Project needs `.claude/todo.md` + `.claude/lessons.md` + `.claude/session-log.md` from day 1. CLAUDE.md must enforce read-on-session-start. Plan files must be linked at top.
**Apply when:** Any new project with multi-session scope. Set up trackers BEFORE first code.

---

## 2026-05-27 — Amended plan supersedes original

**Trigger:** Two plan files exist — `trend-image-app-plan.md` (original) and `check-this-plan-c-users-balaj-projects-t-luminous-prism.md` (amended). User interview locked decisions only reflected in amended.
**Lesson:** When two plan docs disagree, amended wins. List which fields differ in CLAUDE.md so future-me doesn't blend them.
**Apply when:** Any architecture/data-model/scope decision in this project.

---

## 2026-05-27 — Sync reversals across 3 files in one turn

**Trigger:** Post-wiring audit produced 4 decision reversals (Sentry day-1, anonymous trial, 5/week refill, Playwright). Plan file got reversals but `.claude/todo.md`, `CLAUDE.md`, and `.claude/lessons.md` would have drifted if not synced same turn.
**Lesson:** When plan file gets a "Decision Reversals" section, immediately mirror into: (1) `.claude/todo.md` Phase 0 checkboxes resolved + schema-column deltas + new phase subsections, (2) `CLAUDE.md` Source-of-Truth section + Non-Negotiables + Env Vars + Active Skills + Stack list, (3) `.claude/lessons.md` if reversal teaches a recurring pattern. Don't let three files drift.
**Apply when:** Any time the plan file gets a reversal/amendment AFTER the wiring docs (CLAUDE.md/todo.md) are already populated.

---

## 2026-05-27 — agent-browser is not a Playwright replacement

**Trigger:** User asked if `vercel-labs/agent-browser` could serve as the E2E framework.
**Lesson:** agent-browser is a Rust CLI for AI agents to drive browsers via CDP; it lacks the assertion library, fixture system, multi-browser project config, video traces, and CI test-runner that Playwright provides. Correct use: Playwright as primary E2E framework (asserts, fixtures, parallelism), agent-browser as nightly supplemental "agent-as-user" smoke test (natural-language scripts that catch UX regressions Playwright's strict selectors miss).
**Apply when:** Anyone proposes agent-browser/Browserless/Browserbase as a Playwright/Cypress replacement.

---

## 2026-05-28 — Supabase Database type stub triggers `never` on `.from(t).insert/update`

**Trigger:** Multiple files (Stripe webhook, settings soft-delete server action) failed `tsc` with `Argument of type '{ … }' is not assignable to parameter of type 'never'.` against the placeholder `Database` type in `lib/supabase/database.types.ts`.
**Lesson:** Loosening the `Database` stub to `Record<string, GenericTable>` doesn't help because `@supabase/postgrest-js` overload narrowing collapses unknown index signatures to `never`. Until `pnpm supabase:types` runs against the live DB and overwrites the stub, cast the insert/update payload via `const row = { … } as never` with a comment `// Cast required until pnpm supabase:types regenerates strict Database types.` Don't reach for `any` or change the SDK types.
**Apply when:** Any new `.from(table).insert/update(...)` call before strict Database types exist. Remove the cast (and delete the comment) the moment `supabase:types` produces real types.

---

## 2026-05-28 — Zod 4 UUID validator requires RFC 9562 version+variant bytes

**Trigger:** `payload.test.ts` `parses a well-formed user submission` failed with `ZodError: invalid_format uuid` on `'00000000-0000-0000-0000-000000000001'`.
**Lesson:** Zod 4 enforces the RFC 9562 strict regex: the third group must start with the version digit `[1-8]` and the fourth must start with `[89abAB]` (variant). The "nil" all-zero and "max" all-ff UUIDs are also accepted but version-0 UUIDs like `…-0000-0000-…` are not. For test fixtures, use a v4-shape UUID e.g. `'00000000-0000-4000-8000-000000000001'`. For production code, generate via `crypto.randomUUID()` (always v4).
**Apply when:** Writing test UUIDs or hand-rolling constants that flow through a Zod v4 `z.string().uuid()` validator.

---

## 2026-05-28 — Vitest forks pool spawn-UNKNOWN flake on Windows

**Trigger:** `pnpm test` failed once with `spawn UNKNOWN` (errno -4094) and `Cannot find package '@vitest/expect'` errors across 2 of 12 suites; re-run was 78/78 clean with no code change.
**Lesson:** Vitest 4's default `ForksPool` is flaky on Windows under pnpm hoisting — child processes occasionally fail to start. First mitigation: just re-run. If it becomes recurrent, set `pool: 'threads'` in `vitest.config.ts` (slightly slower but stable on Windows), or run with `--pool=threads`. Not a code defect; don't chase it.
**Apply when:** A vitest run on Windows fails with `spawn UNKNOWN` / `Cannot find package '@vitest/expect'` / `Failed to terminate forks worker`. Re-run before debugging.

---

## 2026-05-28 — Edge Function code lives outside tsc include

**Trigger:** Adding `supabase/functions/generate-image/index.ts` (Deno runtime, URL imports, `Deno` globals) broke `pnpm typecheck` because `tsconfig.json`'s `**/*.ts` include grabbed it.
**Lesson:** Exclude `supabase/functions/**` from `tsconfig.json` exclude list. The Deno Edge Function has its own runtime + type system and must not be checked by the Node tsc. If you want type-safety inside the function, add a per-function `deno.json` with a TS config; do not try to make the project-wide tsc compile it.
**Apply when:** Adding any new `supabase/functions/<name>/` file. Verify `tsconfig.json` still excludes the folder.
