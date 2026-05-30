# Security Policy

Trendly is a consumer-facing SaaS handling user images, email addresses, payment metadata, and authentication state. We take security reports seriously and respond in good faith. This document covers what's in scope, how to report, what to expect, and the safe-harbor language under which research must be conducted.

---

## Supported versions

Only the `main` branch — deployed at the production domain (registration in progress; current placeholder `trendly.app`) — receives security updates. Forks, archived branches, and local dev clones are not supported. Pre-release tags before `0.4.0` are not supported.

| Version                   | Supported |
| ------------------------- | --------- |
| `main` (current)          | Yes       |
| `< 0.4.0` (pre-release)   | No        |
| Forks / archived branches | No        |

---

## Reporting a vulnerability

**Preferred channel:** email `security@<domain>` (the real address is announced on the production domain home page; pre-launch this routes to `balaji@kimp.xyz`).

Include in the report:

- Affected endpoint or component (URL path, function name, file path if known)
- Steps to reproduce — minimal repro is ideal
- Expected vs. observed behavior
- Impact assessment — what an attacker can do with this
- Any proof-of-concept payloads, screenshots, or HTTP traces
- Your name + contact info for credit (optional)

**Response SLA:**

| Severity                                                               | Initial acknowledgement | Fix or mitigation plan |
| ---------------------------------------------------------------------- | ----------------------- | ---------------------- |
| Critical (auth bypass, RCE, data exfil at scale, payment manipulation) | Within 72 hours         | Within 14 days         |
| High (account takeover for one user, IDOR, stored XSS)                 | Within 5 business days  | Within 30 days         |
| Medium (CSRF, info disclosure, weak crypto)                            | Within 10 business days | Within 60 days         |
| Low (cosmetic, hardening suggestions)                                  | Within 15 business days | Best-effort            |

We will acknowledge the report, triage severity, communicate a fix timeline, and credit the reporter (with permission) in the changelog once the issue is patched.

---

## Scope

### In scope

- The production web application at the canonical domain (and any `*.trendly.app` subdomain once registered)
- All `/api/*` endpoints — including `/api/generate`, `/api/stripe/webhook`, `/api/push/*`, `/api/me/export`
- All `/admin/*` endpoints behind the admin gate (the gate itself, plus admin-only data access)
- The Supabase Edge Function `generate-image` (publicly callable webhook URL)
- Authentication flows — magic-link email, Google OAuth, anonymous trial fingerprint
- Database RLS policy enforcement (any policy bypass)
- Stripe checkout + webhook handling (idempotency, dedup, signature verification)
- Web Push subscription handling + email fallback dispatch
- GDPR data export + soft-delete + 30-day purge flows
- Any vulnerability in shipped first-party code under this repository

### Out of scope

Report these to the vendor directly, not to us:

- Supabase platform vulnerabilities (Postgres, Auth, Storage, Edge Functions, pg_cron) — report to `security@supabase.io`
- Stripe payment processing vulnerabilities — report via the Stripe Bug Bounty program
- Google Gemini API or Google OAuth — report via Google VRP
- Vercel hosting platform — report to `security@vercel.com`
- Cloudflare (Turnstile, DNS) — report via Cloudflare's HackerOne program
- Resend (transactional email) — report to `security@resend.com`
- Upstash (Redis rate limiting) — report to `security@upstash.com`
- Sentry (error reporting) — report via Sentry's security program
- PostHog (product analytics) — report to `security@posthog.com`
- Browser bugs, third-party JavaScript supply chain attacks outside our dep tree
- Social engineering of staff, customers, or contractors
- Denial of service, volumetric attacks, distributed brute force — we have rate limits and abuse budgets in place; testing them counts as attack, not research
- Reports based on outdated software versions (pre-`0.4.0`)
- Reports of "missing headers" without a working exploit — see "Known limitations" below

---

## Safe harbor

Good-faith security research conducted within this policy will not result in legal action against the researcher. To stay within safe harbor, you must:

- Avoid degrading service for other users — no DoS, no automated mass-traffic testing without explicit pre-coordination
- Avoid accessing, copying, modifying, or deleting other users' data — if you discover the ability to do so, **stop**, document the proof-of-concept on your own account or test data, and report immediately
- Avoid spamming — no mass email, no mass push notifications, no mass Stripe checkout attempts
- Avoid social engineering — do not phish, vish, or impersonate staff, customers, or contractors
- Avoid physical attacks — out of scope entirely
- Comply with all applicable laws (CFAA, CMA, GDPR, etc.) in your jurisdiction and ours
- Give us reasonable time to investigate and fix before any public disclosure (default: 90 days from initial report, or until a fix ships, whichever is shorter)

If you accidentally cross a safe-harbor line during legitimate research, tell us. We'd much rather hear about it from you than from a log alert.

---

## What we don't currently offer

- **No paid bug bounty program.** Trendly is pre-revenue at the time of writing; we cannot offer cash rewards for reports. We may offer a Trendly Pro account credit or swag once the production domain is live, but this is not guaranteed.
- **No formal CVE assignment process.** If a finding warrants a CVE we will coordinate with MITRE; this has not happened to date.
- **No bug bounty platform integration** (HackerOne, Bugcrowd, Intigriti). Reports come direct to email.
- **No PGP-encrypted email channel yet** (see below).

We will credit researchers (with permission) in `SECURITY.md` history and in the changelog at the time the fix ships.

---

## Security measures already in place

The following controls are deployed across `main`:

- **Row-Level Security (RLS)** on every user-facing table — `profiles`, `generations`, `referrals`, `push_subscriptions`, `webhook_events`. Policy enforcement happens at the database, not the application layer; service-role bypass is logged via audit triggers.
- **Idempotency on every state-changing webhook** — `/api/stripe/webhook` dedups via `webhook_events.event_id` unique constraint; `/api/generate` dedups via the `Idempotency-Key` header against a 24-hour window.
- **Audit log on every admin write** — `lib/admin/audit.ts` `logAdminAction()` is the only sanctioned path; bypassing the helper fails code review. Audit rows include actor email, action, target, and JSON diff.
- **Cloudflare Turnstile** on the signup form + the anonymous trial endpoint — defends against scripted abuse before the request reaches our rate limiter.
- **Per-IP rate limits** (Upstash Redis sliding window) — 20 generations per hour per IP at the edge, plus a global $20/day cost ceiling on anonymous generations that auto-disables anonymous mode when breached.
- **Sentry error monitoring** with PII scrubbing (email + IP + auth tokens stripped pre-ingest).
- **Renovate** weekly dependency updates with auto-merge on patch + minor for pinned dev dependencies; runtime deps require human review.
- **Stripe webhook signature verification** — `app/api/stripe/webhook/route.ts` rejects any request without a valid `Stripe-Signature` header signed with `STRIPE_WEBHOOK_SECRET`.
- **Security headers** — `next.config.ts` ships HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy on every response.
- **GDPR soft-delete + 30-day purge** — user-initiated delete sets `profiles.deleted_at`; pg_cron hard-deletes after 30 days; data export via `/api/me/export` returns the full Article-15 payload.
- **Strict TypeScript** — `noImplicitAny`, `strictNullChecks`, no `any` permitted in code review.
- **Test coverage gate** — 404 tests across 43 files; new auth/payment/RLS code requires regression tests.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) "Security posture" section for the full inventory.

---

## Known limitations

These are known gaps. We accept the risk for now; they are tracked publicly so researchers don't waste cycles re-reporting them:

- **CSP (Content-Security-Policy) is intentionally not yet shipped.** Other security headers are present (see above). CSP is on the post-launch hardening backlog — it conflicts with the inline styles emitted by our Tailwind v4 + shadcn setup and needs a nonce-based migration before it can land. Report is welcome if you find an XSS the rest of the stack misses, but "no CSP" by itself is not a finding.
- **No subresource integrity (SRI)** on third-party scripts loaded from Vercel's CDN — same post-launch backlog.
- **No formal threat model document.** ADRs in `docs/adr/` cover the threat reasoning behind each load-bearing decision (RLS quota strategy, idempotency strategy, anonymous trial architecture), but there is no single STRIDE-style document. Buyers performing diligence get the per-ADR breakdown.
- **No SOC 2 / ISO 27001 audit.** This is a pre-revenue solo project. We comply with GDPR Article 28 via the [`docs/legal/DPA_TEMPLATE.md`](./docs/legal/DPA_TEMPLATE.md) sub-processor list, but there is no third-party attestation.

---

## PGP key

PGP key TBD. Until a key is published, please send vulnerability reports via plain email to the address above. Avoid including raw exploit payloads in the email body; attach them as files or link to a private Gist/paste with retention. If your report is highly sensitive and you require encrypted transport, mention this in an unencrypted email and we will coordinate an alternative channel (Signal, Keybase, encrypted file drop).

---

## Hall of fame

Researchers who have responsibly disclosed valid security findings will be credited here, with their permission, after the fix ships.

_No reports to date._

---

## Changelog

| Date       | Change                    |
| ---------- | ------------------------- |
| 2026-05-29 | Initial policy published. |
