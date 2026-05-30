# Trendly — Sub-processor List

**Last updated:** 2026-05-29
**Canonical source:** This file.
**Linked from:** [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §11 and [`docs/legal/DPA_TEMPLATE.md`](./DPA_TEMPLATE.md) Annex 3.

This page lists the sub-processors that Trendly engages to deliver the service. A sub-processor is any third party that processes personal data on behalf of Trendly in connection with the service. Each row identifies the sub-processor, what it is used for, what categories of data are shared with it, where it operates, and a link to its public privacy or DPA documentation.

---

## How we choose sub-processors

Trendly selects sub-processors that meet, at minimum, the following criteria:

- **Documented security posture** — published security overview, ideally with a current SOC 2 Type II, ISO 27001, or equivalent third-party audit.
- **GDPR readiness** — a published DPA, a documented sub-processor list of their own, and a route to Standard Contractual Clauses for cross-border transfers where required.
- **Operational fit** — production-grade reliability, transparent pricing, and an incident-response posture that aligns with Trendly's 72-hour breach notification commitment to customers.
- **Data minimization** — Trendly forwards only the data each sub-processor strictly needs to deliver its function. Where a sub-processor offers optional features that would expand the data shared, Trendly defaults to off.

Vendor consolidation is preferred over fragmentation. Where one platform offers multiple capabilities (e.g., Supabase covers Database + Auth + Storage + Edge Functions), Trendly uses the consolidated offering to reduce the sub-processor count and audit surface.

---

## Current sub-processors

| Sub-processor                        | Purpose                                                                              | Data shared                                                                                                                                  | Location                                                                       | DPA / privacy link                        |
| ------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| **Supabase Inc**                     | Postgres database, authentication, storage, Edge Functions, `pg_cron` scheduled jobs | User accounts, generation history, payment-event log, anonymous attempt records, push subscriptions                                          | US (Multi-region; primary `us-east-1`)                                         | https://supabase.com/legal/dpa            |
| **Vercel Inc**                       | Application hosting, CDN, Edge runtime, build pipeline                               | All HTTP request data, build artifacts, server logs                                                                                          | US (Multi-region)                                                              | https://vercel.com/legal/dpa              |
| **Google LLC**                       | Gemini API (Nano Banana / Pro) for image generation                                  | User-uploaded photos (transient; not stored by Google per the Gemini API terms when called via paid API), prompt template text               | US                                                                             | https://policies.google.com/privacy       |
| **Stripe Inc**                       | Payment processing for credit-pack purchases, webhook event delivery                 | Customer email, tokenized card data (Stripe never shares the raw card data with us), purchase amounts, billing address (collected by Stripe) | US, EU (multi-region)                                                          | https://stripe.com/legal/privacy-center   |
| **Resend Inc**                       | Transactional email delivery (magic-link sign-in, push-fallback notifications)       | Email addresses, email content (subject + HTML body)                                                                                         | US (Multi-region)                                                              | https://resend.com/legal/privacy-policy   |
| **Cloudflare Inc**                   | Turnstile (bot challenge at signup + anonymous trial), DNS resolution                | IP addresses (transient), browser fingerprint (hashed before storage)                                                                        | Global (edge network)                                                          | https://www.cloudflare.com/privacypolicy/ |
| **PostHog Inc**                      | Product analytics — funnel conversion, feature usage, retention cohorts              | User session events, IP address (IP-anonymization enabled), client-issued user id                                                            | US                                                                             | https://posthog.com/privacy               |
| **Functional Software Inc (Sentry)** | Error monitoring — server, edge, and browser exception capture; performance traces   | Stack traces, request URLs, scrubbed request bodies, masked user IDs (local-part replaced before transmission)                               | US                                                                             | https://sentry.io/privacy/                |
| **Upstash Inc**                      | Redis cache for per-IP rate limiting and the anonymous-trial daily abuse budget      | IP address hashes (transient, with TTLs ≤ 24 hours)                                                                                          | Global (multi-region; primary region selected closest to Vercel deploy region) | https://upstash.com/trust                 |

---

## What each sub-processor cannot do

A note on the boundaries of what each sub-processor receives — useful in pre-sales conversations and DPA negotiations:

- **Google (Gemini)** does not retain user photos or prompts when called via the paid API (per Google's published Gemini API terms). Trendly does not opt into any model-training data-sharing feature, so user inputs are processed in inference-only mode.
- **Stripe** receives card data directly from the user's browser via Stripe Checkout. Trendly's servers never see the raw card number, CVV, or expiry — only the Stripe-issued tokenized identifiers and the email/billing address Stripe forwards to us.
- **PostHog** is configured with IP-anonymization on (last octet zeroed for IPv4, equivalent prefix truncation for IPv6). Users can opt out per [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §5.5.
- **Sentry** is configured with a `beforeSend` hook that scrubs request bodies and headers before transmission. The email-mask helper in `lib/email/send.ts` ensures the local part of email addresses is replaced with `***` before any error report containing an email reference is sent to Sentry.
- **Cloudflare Turnstile** receives a transient browser fingerprint for bot-detection only. The fingerprint is hashed before any Trendly-side storage and is purged within 24 hours by the `pg_cron` job `purge_expired_anonymous`.

---

## Cross-border transfers

Several of the sub-processors above are based in the United States. For end users in the EEA, the UK, or Switzerland, Trendly relies on the following transfer mechanisms:

- **Standard Contractual Clauses (SCCs)** — incorporated into each sub-processor's DPA. Trendly has reviewed each sub-processor's published SCC implementation and accepts the standard text where the sub-processor offers it.
- **UK International Data Transfer Addendum** — applied for transfers from the United Kingdom, as referenced in [`docs/legal/DPA_TEMPLATE.md`](./DPA_TEMPLATE.md) §9.3.
- **EU-US Data Privacy Framework** — where a US sub-processor is self-certified to the EU-US DPF, Trendly relies on that certification as the primary transfer mechanism, with SCCs as a fallback.

---

## Adding or removing a sub-processor

When Trendly adds, removes, or replaces a sub-processor, the following process applies:

1. **Internal review** — operator (pre-acquisition) or buyer's data protection lead (post-acquisition) reviews the sub-processor's security posture, DPA, and transfer mechanisms. Document the review in `docs/legal/sub-processor-reviews/<vendor>.md`.
2. **Update this list** — edit the table above with the new row, including the data categories shared and location. Bump the "Last updated" date.
3. **Notify customers** — for any customer who has a signed DPA with Trendly that incorporates Section 5.3 (Changes to Sub-processors), send an email notice at least **thirty (30) days** in advance of the change. The notice must include:
   - The new sub-processor's name and function.
   - The data categories that will be shared.
   - The location of processing.
   - A link to the sub-processor's privacy / DPA documentation.
   - The effective date of the change.
4. **Update the DPA template** — sync [`docs/legal/DPA_TEMPLATE.md`](./DPA_TEMPLATE.md) Annex 3 with the new list, so future DPAs reflect the current state.
5. **Update the Privacy Policy** — if the new sub-processor introduces a new data category (e.g., voice data for a future feature), update [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §2.3 accordingly. Material changes to the Privacy Policy follow the 14-day notice rule in §9 of that policy.

For routine vendor swaps within the same category (e.g., changing email provider from Resend to a competitor), the 30-day notice still applies — the same data categories are being shared, but with a different processor.

For removals (a sub-processor is decommissioned), the notice is informational only, no customer objection right is implicated.

---

## Cross-references

- [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §11 — public-facing reference to this list.
- [`docs/legal/DPA_TEMPLATE.md`](./DPA_TEMPLATE.md) §5 + Annex 3 — contractual obligations around sub-processor changes.
- [`docs/CREDENTIALS.md`](../CREDENTIALS.md) — operational reference: each sub-processor's environment variable and "what breaks if missing" matrix.
- [`docs/sops/incident_response.md`](../sops/incident_response.md) — the playbook when a sub-processor outage triggers an incident on Trendly's side.
