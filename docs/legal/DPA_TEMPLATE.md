# Data Processing Agreement (Template)

**Last updated:** 2026-05-29
**Status:** Template. Send to `legal@<domain>` for review before signing. Customize Annex 1 + Annex 2 per deal.

This template is a starting point for B2B / agency customers who require a Data Processing Agreement before contracting. It is drafted to GDPR Article 28 requirements with reference to Standard Contractual Clauses for cross-border transfers. It is **not** legal advice and should be reviewed by qualified counsel in the relevant jurisdiction before execution.

Variables to fill before sending:
- `[CUSTOMER NAME]`, `[CUSTOMER ADDRESS]`, `[CUSTOMER CONTACT]`
- `[CUSTOMER ENTITY TYPE]` (e.g. limited company, LLC, GmbH)
- `[EFFECTIVE DATE]`
- `[GOVERNING LAW JURISDICTION]`
- Annex 1 — replace bracketed examples with this customer's actual processing scope.
- Annex 2 — confirm the listed TOMs still match the current architecture (re-validate at signing time against [`docs/RUNBOOK.md`](../RUNBOOK.md) §2 and [`docs/SUB_PROCESSORS.md`](./SUB_PROCESSORS.md)).

---

## Data Processing Agreement

This Data Processing Agreement ("**DPA**") forms part of the master services agreement, terms of service, or order form (the "**Principal Agreement**") between:

**(1) [CUSTOMER NAME]**, a [CUSTOMER ENTITY TYPE] organized under the laws of [JURISDICTION], with its principal place of business at [CUSTOMER ADDRESS] ("**Customer**" or "**Controller**"); and

**(2) Trendly**, operated by [LEGAL ENTITY NAME — placeholder until incorporation finalised], with its principal place of business at [TRENDLY ADDRESS] ("**Trendly**" or "**Processor**").

(each a "**Party**" and together the "**Parties**").

**Effective Date:** [EFFECTIVE DATE].

---

## 1. Definitions

In this DPA, capitalized terms have the meanings given below. Terms not defined here have the meanings given in the Principal Agreement or, failing that, in Regulation (EU) 2016/679 (the "**GDPR**").

- **"Controller"** means the natural or legal person which determines the purposes and means of the Processing of Personal Data.
- **"Processor"** means a natural or legal person which Processes Personal Data on behalf of the Controller.
- **"Personal Data"** means any information relating to an identified or identifiable natural person, as defined in Article 4(1) GDPR.
- **"Processing"** means any operation performed on Personal Data, as defined in Article 4(2) GDPR.
- **"Sub-processor"** means any third-party processor engaged by Trendly to Process Personal Data on Customer's behalf in connection with the Services.
- **"Personal Data Breach"** means a breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, Personal Data.
- **"Data Subject"** means an identified or identifiable natural person whose Personal Data is Processed.
- **"Services"** means the services provided by Trendly to Customer under the Principal Agreement.
- **"Standard Contractual Clauses"** or **"SCCs"** means the standard contractual clauses for the transfer of Personal Data to third countries pursuant to GDPR adopted by the European Commission (Commission Implementing Decision (EU) 2021/914 of 4 June 2021), as updated from time to time.
- **"Applicable Data Protection Law"** means all laws and regulations applicable to the Parties' Processing of Personal Data, including but not limited to GDPR, the UK Data Protection Act 2018, and (where applicable) the California Consumer Privacy Act / California Privacy Rights Act ("CCPA/CPRA").

---

## 2. Scope, nature, and purpose of Processing

### 2.1 Scope

This DPA applies to all Processing of Personal Data by Trendly on behalf of Customer in connection with the Services.

### 2.2 Roles

Customer is the Controller of Personal Data Processed under the Principal Agreement. Trendly is the Processor. Where Customer is itself a processor acting on behalf of a third-party controller, Trendly acts as a sub-processor under those instructions.

### 2.3 Nature and purpose

The nature and purpose of Processing are set out in **Annex 1**.

### 2.4 Customer's instructions

Trendly shall Process Personal Data only on documented instructions from Customer, including with regard to transfers of Personal Data to a third country, unless required to do so by applicable law. The Principal Agreement, this DPA, and Customer's use of the Services configuration constitute Customer's documented instructions.

If Trendly believes an instruction infringes Applicable Data Protection Law, Trendly shall inform Customer without undue delay.

---

## 3. Term and termination

### 3.1 Term

This DPA takes effect on the Effective Date and remains in force for so long as Trendly Processes Personal Data on Customer's behalf in connection with the Services.

### 3.2 Survival

Sections relating to confidentiality, data deletion (Section 11), and liability (Section 13) survive termination of this DPA.

### 3.3 Effect of termination

On termination of the Services, Trendly shall, at Customer's choice, delete or return all Personal Data Processed on Customer's behalf. See Section 11.

---

## 4. Processor obligations

### 4.1 Confidentiality

Trendly shall ensure that personnel authorized to Process Personal Data are bound by appropriate confidentiality obligations, whether by written agreement or statutory duty.

### 4.2 Security

Trendly shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including those described in **Annex 2** (Technical and Organizational Measures, "**TOMs**").

### 4.3 Cooperation

Trendly shall assist Customer in fulfilling Customer's obligations under Applicable Data Protection Law, including:
- Responding to requests from Data Subjects exercising their rights under Chapter III of GDPR (Section 6).
- Meeting Customer's obligations in relation to security (GDPR Article 32), Personal Data Breach notification (Articles 33–34), data protection impact assessments (Articles 35–36), and prior consultation with supervisory authorities.

### 4.4 Records of Processing

Trendly shall maintain records of all categories of Processing activities carried out on behalf of Customer as required by GDPR Article 30(2).

---

## 5. Sub-processors

### 5.1 General authorisation

Customer hereby authorises Trendly to engage Sub-processors to Process Personal Data on Customer's behalf, subject to this Section 5 and the list set out in **Annex 3**.

### 5.2 List of Sub-processors

Trendly's current Sub-processors are listed at [`docs/SUB_PROCESSORS.md`](./SUB_PROCESSORS.md) and reproduced in **Annex 3**. The canonical list at that URL prevails in the event of conflict; Annex 3 reflects the list as of the Effective Date.

### 5.3 Changes to Sub-processors

Trendly shall give Customer at least thirty (30) days' prior notice of any addition or replacement of a Sub-processor by email to the address Customer has provided for the purpose. During the notice period, Customer may object on reasonable grounds related to data protection. If the Parties cannot resolve the objection, Customer may terminate the Principal Agreement on written notice, with a pro-rata refund of pre-paid fees for unused Services.

### 5.4 Sub-processor obligations

Trendly shall impose data protection obligations on its Sub-processors that are no less protective than those set out in this DPA. Trendly remains liable to Customer for the acts and omissions of its Sub-processors.

---

## 6. Data Subject rights

Trendly shall, taking into account the nature of the Processing, assist Customer by appropriate technical and organisational measures, insofar as possible, in fulfilling Customer's obligation to respond to requests from Data Subjects exercising their rights under Chapter III GDPR (including the right of access, rectification, erasure, restriction of processing, data portability, and objection).

Where a Data Subject sends a rights request directly to Trendly, Trendly shall promptly forward the request to Customer and shall not respond to the request directly except on Customer's instructions or as required by law.

The Services include self-service rights tooling (see [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §5) that Customer may use to fulfil rights requests without manual Trendly intervention.

---

## 7. Personal Data Breach notification

### 7.1 Notification to Customer

Trendly shall notify Customer of any Personal Data Breach affecting Personal Data Processed on Customer's behalf without undue delay and in any event within seventy-two (72) hours of becoming aware of the breach.

### 7.2 Contents of the notification

The notification shall include, to the extent known at the time:
- The nature of the breach, including the categories and approximate number of Data Subjects and records affected.
- The name and contact details of the Trendly point of contact for further information.
- The likely consequences of the breach.
- The measures taken or proposed to address the breach and mitigate its possible adverse effects.

Where it is not possible to provide all of the above at once, Trendly may provide the information in phases without further undue delay.

### 7.3 Cooperation

Trendly shall cooperate with Customer and any supervisory authority in respect of any Personal Data Breach, including providing information reasonably required for Customer to fulfil its own notification obligations under GDPR Articles 33 and 34.

### 7.4 No admission of liability

Trendly's notification of, and response to, a Personal Data Breach shall not be construed as an acknowledgement by Trendly of fault or liability with respect to the breach.

---

## 8. Audit rights

### 8.1 Right to audit

Trendly shall make available to Customer, on reasonable written request and no more than once per calendar year (except in the case of a Personal Data Breach or supervisory authority request), all information necessary to demonstrate compliance with this DPA.

### 8.2 Audit method

Customer's audit right shall be satisfied by:
- The provision by Trendly of summary reports of relevant audits or certifications it holds (e.g., SOC 2 Type II, ISO 27001, when available); or
- A written questionnaire from Customer to which Trendly shall respond within thirty (30) days.

### 8.3 On-site audit

An on-site audit may be conducted only if Customer reasonably demonstrates that the methods in Section 8.2 are insufficient. Any on-site audit shall be conducted at Customer's expense, on at least thirty (30) days' prior written notice, during business hours, and subject to reasonable confidentiality undertakings.

### 8.4 Limitation

Audit rights do not extend to information that would compromise the confidentiality, security, or commercial interests of other Trendly customers.

---

## 9. International transfers

### 9.1 General

Trendly may transfer Personal Data to a country outside the European Economic Area or the United Kingdom only where:
- The European Commission or UK competent authority has issued an adequacy decision in respect of the destination country; or
- Appropriate safeguards under GDPR Article 46 are in place, including the Standard Contractual Clauses; or
- A specific derogation under GDPR Article 49 applies.

### 9.2 SCCs

Where Personal Data is transferred from the EEA, the United Kingdom, or Switzerland to a country that has not received an adequacy decision, the Parties agree that the SCCs are incorporated by reference into this DPA. The applicable module is Module Two (Controller to Processor). Module Three (Processor to Sub-processor) applies between Trendly and its Sub-processors.

### 9.3 UK Addendum

For transfers from the United Kingdom, the International Data Transfer Addendum issued by the Information Commissioner's Office (Version B1.0, in force on 21 March 2022) applies and is incorporated by reference.

### 9.4 Sub-processor transfers

Trendly's Sub-processors are listed in **Annex 3** with their location. Where a Sub-processor is located outside the EEA / UK, Trendly has put in place an appropriate transfer mechanism (typically the SCCs as part of the Sub-processor's standard contract).

---

## 10. Liability and indemnification

### 10.1 Liability

Each Party's liability arising out of or in connection with this DPA shall be subject to the limitation of liability set out in the Principal Agreement.

### 10.2 Allocation of liability for fines

To the extent permitted by Applicable Data Protection Law, the Parties shall be liable to Data Subjects under Article 82 GDPR only for damage caused by their own non-compliant Processing. The Parties may seek contribution from one another in proportion to their respective responsibility.

### 10.3 Indemnification

Each Party shall indemnify and hold harmless the other from and against any damages, fines, or penalties incurred as a direct result of the indemnifying Party's material breach of this DPA, subject always to the limitations in Section 10.1.

---

## 11. Return and deletion of Personal Data

### 11.1 At termination

On termination of the Services, Trendly shall, at Customer's choice expressed in writing within thirty (30) days of termination:
- Return all Personal Data Processed on Customer's behalf in a commonly used machine-readable format (typically JSON via the export tooling described in [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §5.1); or
- Delete all Personal Data Processed on Customer's behalf and certify deletion in writing.

If Customer does not exercise either option within thirty (30) days, Trendly may delete the Personal Data without further notice.

### 11.2 Retention for legal compliance

Trendly may retain Personal Data to the extent required by applicable law, including for tax, accounting, and anti-fraud purposes. Such retained data shall be subject to continued confidentiality and security obligations under this DPA.

### 11.3 Backups

Personal Data in routine backups will be deleted in accordance with Trendly's standard backup rotation, not later than ninety (90) days after the deletion in production systems.

---

## 12. Governing law and jurisdiction

This DPA is governed by the law of [GOVERNING LAW JURISDICTION], and the Parties submit to the exclusive jurisdiction of the courts of [GOVERNING LAW JURISDICTION], save that either Party may seek interim or injunctive relief in any court of competent jurisdiction.

---

## 13. Miscellaneous

### 13.1 Order of precedence

In the event of conflict between this DPA and the Principal Agreement on any matter relating to the Processing of Personal Data, this DPA prevails.

### 13.2 Variation

This DPA may be varied only by written agreement signed by both Parties, save that Trendly may unilaterally update **Annex 3** (Sub-processors) in accordance with Section 5.3.

### 13.3 Severability

If any provision of this DPA is found to be invalid or unenforceable, the remaining provisions remain in full force and effect.

### 13.4 Entire agreement

This DPA, together with the Principal Agreement, constitutes the entire agreement between the Parties on its subject matter and supersedes any prior agreement on data processing.

---

**Signed for and on behalf of [CUSTOMER NAME]:**

Name: ______________________________
Title: ______________________________
Date: ______________________________
Signature: ______________________________

**Signed for and on behalf of Trendly:**

Name: ______________________________
Title: ______________________________
Date: ______________________________
Signature: ______________________________

---

# Annex 1 — Details of Processing

| Item | Detail |
|---|---|
| **Subject matter of the Processing** | [The provision of an AI image generation service to Customer's end users via the Trendly platform.] |
| **Duration of the Processing** | For the term of the Principal Agreement, subject to the retention windows in Section 11 and [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §4. |
| **Nature and purpose of the Processing** | [Hosting, transmission, storage, and AI-based transformation of end-user-uploaded photographs and associated metadata to deliver the Services to Customer's end users. Processing of payment metadata via the Stripe sub-processor for billing. Sending transactional notifications via the Resend sub-processor.] |
| **Types of Personal Data** | [End-user email addresses; account display name and avatar (where provided via OAuth); user-uploaded photographs (which may contain biometric identifiers); user-generated output images derived from those photographs; IP addresses (transient, hashed for anti-abuse); browser fingerprint hashes (anti-abuse only); push notification subscription tokens.] |
| **Categories of Data Subjects** | [Customer's end users / authorized account holders.] |
| **Frequency of transfer** | [Continuous, for the duration of Service usage.] |
| **Retention periods** | As set out in [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §4. Summary: uploaded source photos deleted within 24 hours; generated outputs purged 30 days after generation on free tier or on account deletion on paid tier; anonymous-trial fingerprint hashes purged within 24 hours; Stripe payment metadata retained 7 years for accounting compliance. |
| **Special categories of data** | Uploaded photographs may contain biometric identifiers (Article 9 GDPR) by virtue of being images of identifiable persons. Customer represents that it has obtained any consents required from its end users to upload such images. |

---

# Annex 2 — Technical and Organizational Measures (TOMs)

The following TOMs are in place as of the Effective Date. Trendly may update these measures provided the level of security is not diminished.

## A. Access control

- **Role-Based Access Control (RBAC)** at the database layer via PostgreSQL Row Level Security (RLS). Every table containing Personal Data has explicit `auth.uid()`-scoped RLS policies. See [`docs/adr/0002-rls-quota-strategy.md`](../adr/0002-rls-quota-strategy.md).
- **Multi-factor authentication (MFA)** required on all administrator accounts (Vercel, Supabase, Stripe, GitHub).
- **Principle of least privilege.** Service-role keys are used only in trusted server contexts (Stripe webhook, Edge Functions, scheduled jobs). The publishable key used in browser clients cannot bypass RLS.
- **Admin audit trail.** All administrative actions affecting user data (refunds, account suspensions, trend takedowns) are written to the `admin_audit_log` table via SECURITY DEFINER functions, with the acting `admin_id` recorded.

## B. Encryption

- **In transit.** All Trendly endpoints serve HTTPS only, with HSTS preload. Connections to Supabase, Stripe, Gemini, Resend, and other Sub-processors use TLS 1.2+ exclusively.
- **At rest.** Database and storage are encrypted at rest by Supabase (AES-256). Vercel build artifacts are encrypted at rest. No Personal Data is written to disk outside encrypted Sub-processor systems.

## C. Network security

- **Edge-first deployment.** API routes run on Vercel's edge runtime where possible, minimizing the surface area of long-lived server processes.
- **Rate limiting.** Per-IP rate limits enforced at the `/api/generate` route (20/hr/IP) via Upstash Redis. Anonymous-trial endpoint enforces a separate sliding window per browser fingerprint.
- **Bot protection.** Cloudflare Turnstile challenge on signup and anonymous-trial endpoints.
- **Anti-CSRF.** Server actions use Next.js's built-in CSRF protection; Supabase session cookies are HttpOnly + SameSite=Lax + Secure-in-production.

## D. Application security

- **Strict TypeScript.** No `any` types in security-sensitive paths.
- **Input validation.** All API inputs validated with Zod schemas at the route boundary. Sub-processor inputs (e.g., to Gemini) are validated and constrained to the expected shape.
- **Idempotency.** Generation endpoint accepts and dedupes `Idempotency-Key` headers; Stripe webhook handler dedupes by `event_id` UNIQUE constraint on the `webhook_events` table.
- **Soft-delete + cascade.** Account deletions are soft-deleted immediately with a 30-day hard-delete cascade via `pg_cron`. See [`docs/adr/0006-soft-delete-cascade.md`](../adr/0006-soft-delete-cascade.md).

## E. Monitoring and incident response

- **Error monitoring.** Sentry captures server, edge, and browser errors with PII scrubbing on request bodies and headers.
- **Product analytics.** PostHog with IP-anonymization options; users may opt out per [`docs/PRIVACY_POLICY.md`](../PRIVACY_POLICY.md) §5.5.
- **Incident response.** Documented playbook at [`docs/sops/incident_response.md`](../sops/incident_response.md), with severity matrix and 72-hour breach notification process aligned with GDPR Article 33.

## F. Personnel

- **Background checks.** Where required by applicable law for the jurisdictions in which Trendly personnel operate.
- **Confidentiality.** All personnel with access to Personal Data are bound by written confidentiality obligations.
- **Training.** Personnel with access to Personal Data receive periodic training on data protection requirements and Trendly's security policies.

## G. Sub-processor management

- All Sub-processors are listed in [`docs/SUB_PROCESSORS.md`](./SUB_PROCESSORS.md) with their purpose, data shared, and location.
- Sub-processors are selected based on documented security posture, GDPR readiness, and contractual data protection commitments.
- Changes to the Sub-processor list are notified to Customer in accordance with Section 5.3.

## H. Business continuity

- **Backups.** Daily automated backups of the Supabase Postgres database with point-in-time recovery for the past 7 days.
- **Disaster recovery.** RTO target 4 hours, RPO target 24 hours, subject to Sub-processor SLAs.
- **Dependency redundancy.** Image generation provider is abstracted at the application layer (`lib/image-provider/index.ts`) to enable runtime failover between Gemini and OpenAI without code change.

---

# Annex 3 — List of Sub-processors

This Annex reflects the Sub-processors authorised at the Effective Date. The canonical, up-to-date list is maintained at [`docs/SUB_PROCESSORS.md`](./SUB_PROCESSORS.md). On any change, Trendly will notify Customer in accordance with Section 5.3.

| Sub-processor | Purpose | Data shared | Location |
|---|---|---|---|
| Supabase Inc | Database, Auth, Storage, Edge Functions, scheduled jobs | User accounts, generations, payment event log, anonymous attempts | US (Multi-region) |
| Vercel Inc | Application hosting, CDN, Edge runtime | All HTTP request data, server logs | US (Multi-region) |
| Google LLC | Gemini API for image generation | User-uploaded photos (transient), prompt text | US |
| Stripe Inc | Payment processing | Customer email, tokenized card data, purchase amounts | US, EU (multi-region) |
| Resend Inc | Transactional email delivery | Email addresses, email content | US (Multi-region) |
| Cloudflare Inc | Bot challenge (Turnstile), DNS | IP addresses (transient), browser fingerprint (hashed) | Global |
| PostHog Inc | Product analytics | User session events, IP address | US |
| Functional Software Inc (Sentry) | Error monitoring | Stack traces, request URLs, masked user IDs | US |
| Upstash Inc | Redis (rate limiting, abuse budget) | IP address hashes (transient) | Global (multi-region) |

For each Sub-processor, Trendly has reviewed and relies on the Sub-processor's published DPA / privacy commitments and (where required) Standard Contractual Clauses for cross-border transfers. Links to each Sub-processor's data protection documentation are maintained in [`docs/SUB_PROCESSORS.md`](./SUB_PROCESSORS.md).

---

**End of Data Processing Agreement.**
