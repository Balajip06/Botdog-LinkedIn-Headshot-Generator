# Trendly — Privacy Policy (Draft)

**Status:** Draft. Not yet hosted on the live site. Once `app/(public)/privacy/page.tsx` is built, this file becomes the canonical source and the page renders from it.

**Last updated:** 2026-05-29.

---

## 1. Who we are

Trendly ("we", "us", "the service") operates this viral-trend image generator. Contact: support@trendly.example (placeholder — wire to real email before launch).

## 2. What we collect

### 2.1 You provide

- **Email address.** When you sign in (Google OAuth or magic link), we collect the email associated with your account.
- **Name and avatar.** If you sign in with Google, we receive your display name and profile picture.
- **Photos you upload.** Stored privately while the generation is in flight.
- **Optional text inputs.** Free-text fields some trends expose (e.g. a "power name" for the anime trend).

### 2.2 We observe automatically

- **Generation history.** Each trend you generate is logged with: trend slug, model used, status (completed/failed), cost, and timestamp.
- **Output images.** The result image stored for download + sharing.
- **Quota counters.** Free generations used this week, credit balance, bonus credits earned.
- **Referral attribution.** If you arrived via a referral link, we record the referring user once on signup.
- **Anti-abuse fingerprint** (anonymous trial only). When you generate without signing in, we hash your browser fingerprint + IP into a one-way SHA-256 digest to prevent the same person from claiming more than 1 anonymous generation. The hash cannot be reversed to identify you.
- **Push subscription** (optional). If you grant notification permission, we store the browser-issued push subscription so we can ping you when a slow generation completes.

### 2.3 We use third-party tools

- **PostHog** for product analytics — funnel conversion, feature usage. You can opt out from Settings (toggle in development).
- **Sentry** for error monitoring — uncaught exceptions + performance traces. Sensitive content (request bodies, headers) is scrubbed before upload.
- **Stripe** for payments — Stripe receives your email + payment details directly. We never see your card number.
- **Resend** for transactional emails — magic links + generation-ready notifications.
- **Cloudflare Turnstile** for bot-check at signup.
- **Google Gemini (Nano Banana / Pro)** for image generation — your photo + prompt are sent to Google's API. Google's data-handling terms apply to that data flow.

## 3. How we use it

- **Run the service** — accept your photo, send to Gemini, return the result.
- **Bill correctly** — apply free-tier weekly quota, deduct credits, refund on failure.
- **Notify you** — push or email when a generation completes if you opted in.
- **Detect abuse** — anonymous-trial fingerprint hash to enforce 1-try-per-device, IP rate limits on the generation endpoint.
- **Improve the product** — anonymized event analytics, performance traces.
- **Comply with the law** — respond to subpoenas, court orders, takedown notices.

We do **not** use your photos or generation outputs to train any model. Inputs are forwarded to Google's Gemini API for inference only; per Gemini's terms they are not used for model training when called via the paid API.

## 4. How long we keep it

| Data | Free tier retention | Pro tier retention |
|---|---|---|
| Uploaded photo | 24 hours, then deleted | 24 hours, then deleted |
| Generated output image | 30 days, then auto-purged | While account is active |
| Generation history rows | While account is active | While account is active |
| Profile + quota counters | While account is active | While account is active |
| Anonymous-trial fingerprint hash | 24 hours, then auto-purged | n/a |
| Stripe webhook event log | 30 days (idempotency) | 30 days |
| Sentry error logs | 30 days | 30 days |
| PostHog events | 365 days | 365 days |

After you delete your account (Settings → Danger zone → Delete my account):

- Your profile is marked deleted immediately. You cannot sign in again under the same email without contacting support.
- Within 30 days, all your generation rows + output images are permanently purged via the scheduled `pg_cron` job.
- We retain the minimum metadata required for legal compliance (Stripe payment records for 7 years per accounting law).

## 5. Your rights (GDPR + CCPA)

### 5.1 Right of access (GDPR Article 15 / CCPA right to know)

Settings → Your data → **Download my data**. You get a JSON file containing your full profile + generation history + signed download URLs for every completed generation (valid for 1 hour).

### 5.2 Right to erasure (GDPR Article 17 / CCPA right to delete)

Settings → Danger zone → **Delete my account**. Immediate soft-delete, full purge within 30 days.

### 5.3 Right to rectification (GDPR Article 16)

Email support to correct any inaccurate data we hold.

### 5.4 Right to data portability (GDPR Article 20)

The export from §5.1 is in machine-readable JSON.

### 5.5 Right to object (GDPR Article 21)

You may opt out of analytics by toggling PostHog off in Settings (when wired) or by sending us an email request.

### 5.6 CCPA "Do Not Sell"

We do not sell personal information.

## 6. International transfers

Trendly runs on Vercel + Supabase, which may store and process data in the United States. By using the service from outside the United States, you consent to this transfer. We rely on the Standard Contractual Clauses for EU-to-US transfers where applicable.

## 7. Cookies

We use the minimum required cookies:

- **Supabase session cookie** — keeps you signed in. HttpOnly, SameSite=Lax, Secure in production.
- **Referral attribution cookie** (`tig_ref`) — 30-day expiry, HttpOnly, SameSite=Lax. Set only if you arrived via a referral link.
- **PostHog client cookies** — analytics, opt-out via Settings.

We do not use third-party advertising cookies.

## 8. Children

The service is not directed to children under 13. We do not knowingly collect data from anyone under 13. If you believe we have collected data from a child under 13, email support and we will delete it within 7 days.

## 9. Changes to this policy

We may update this policy. Material changes are announced via email + a home-page banner at least 14 days in advance.

## 10. Sub-processors

We use the sub-processors listed at [`docs/legal/SUB_PROCESSORS.md`](./legal/SUB_PROCESSORS.md) — including the providers named in §2.3 above (Supabase, Vercel, Google, Stripe, Resend, Cloudflare, PostHog, Sentry, Upstash). That page is the canonical, up-to-date list, with each sub-processor's purpose, the data shared with them, their location, and a link to their published privacy or data-processing terms.

We commit to giving at least **30 days' advance notice** by email to paid customers before adding, removing, or replacing any sub-processor that processes personal data on our behalf. The notice will identify the new sub-processor, the data categories that will be shared, and the effective date of the change. Customers may object on reasonable data-protection grounds within the notice period; unresolved objections give the customer a right to terminate paid services with a pro-rata refund.

## 11. Contact + complaints

For privacy questions: support@trendly.example.

EU residents may lodge a complaint with their national supervisory authority. UK residents may contact the ICO.

---

**Engineering notes** (delete before publishing the public policy):

- This is the working draft paired with `docs/TERMS_OF_SERVICE.md`.
- Wire into `app/(public)/privacy/page.tsx` along with the ToS in the same commit.
- §4 retention windows mirror migration 0005 pg_cron job schedule — keep in sync if either changes.
- §5.1 right-of-access maps to `/api/me/export` (commit `9842c6f`).
- §5.2 right-to-erasure maps to the soft-delete server action in `app/(app)/me/settings/page.tsx`.
- §7 cookie list maps to `proxy.ts` + `lib/referrals/links.ts` + `components/providers/posthog-provider.tsx`.
- Sentry scrubbing claim (§2.3) needs verification once Sentry is fully wired — confirm `beforeSend` scrubs request bodies.
