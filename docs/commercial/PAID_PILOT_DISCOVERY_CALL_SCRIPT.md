# Paid pilot discovery call script

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · founder-owned · **not legal advice** · **not a contract** |
| **Base** | `origin/main` at `3a92bd44ab1bfa64d4e8edf9cd71b4934a1e085a` |
| **Last reconciled** | 2026-08-13 |

## Purpose

Plain-English **~20-minute** discovery script for **age-gated digital commerce** prospects. Use to qualify interest in a **proposed 30-day paid pilot**.

**Pricing, scope, support commitments, and contract terms are subject to mutual agreement and counsel-approved documents.** This script does not promise compliance, legal sufficiency, certification, or an SLA.

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Cited implementation or doc. |
| **Proposed question** | Qualification question; answer not in repo. |
| **Proposed target** | Operator goal; not guaranteed. |

**Initial commercial wedge:** age-gated digital commerce only. Cannabis is **secondary/future** — do not position as initial pilot or legal scope.

---

## Pre-call prep (5 min)

| Task | Notes |
|------|-------|
| Review prospect site/checkout | **Proposed target** |
| Note current age-gate UX | Friction hypothesis |
| Read `docs/commercial/PAID_PILOT_ONE_PAGER.md` | Leave-behind after call |
| Confirm no compliance promises prepared | Required |

---

## Opening (2 min)

> "Thanks for taking the time. I'm [Name] from Abraxas. We build a beta-stage trust and authorization layer for age-gated digital commerce — think reusable eligibility proof at checkout instead of re-uploading an ID every time.
>
> Abraxas is **not** a KYC provider. We issue policy-bound decisions and signed receipts your backend can verify. We're exploring **proposed 30-day paid pilots** with a small number of integrators. Nothing today is a binding offer — pricing and contract terms need mutual agreement and counsel-approved documents.
>
> I'd like to understand your current verification friction and whether a pilot structure could help. I'll ask questions for about 15 minutes and leave time for yours."

---

## Discovery questions

### A. Current verification friction (~3 min)

| Question | Why we ask |
|----------|------------|
| Where in your funnel do users hit an age gate or ID check today? | Maps to Partner Flow entry — `public/openapi/partner-flow.openapi.yaml` |
| How often do returning users repeat the same document upload? | Core value prop — `lib/complianceGatePositioning.ts` L8–9 |
| What is your rough drop-off at that step? | KPI: conversion — `docs/commercial/INTEGRATION_KPI_SCORECARD.md` |

### B. Data exposure (~3 min)

| Question | Why we ask |
|----------|------------|
| What PII do you store after verification (images, DOB, document numbers)? | Prospect risk profile |
| Who internally can see raw ID images? | Contrast with documented partner-output path — `lib/partner/partnerVerificationResult.ts` L20–27 |
| Do you share verification data with subprocessors? | **Proposed question** — counsel TBD |

### C. Manual review (~2 min)

| Question | Why we ask |
|----------|------------|
| How many hours per week does your team spend on manual identity review? | Pilot success metric — `lib/designPartnerOutreach.ts` L28 |
| What triggers manual review today? | Policy alignment — `lib/policy/types.ts` |

### D. Jurisdiction (~3 min)

| Question | Why we ask |
|----------|------------|
| Which US states or countries do you sell into? | **Proposed question** — counsel analysis required |
| Do you need 18+ vs 21+ rules by SKU or jurisdiction? | Maps to `minimum_age` policy — `lib/policy/types.ts` L50–51 |
| Who owns compliance sign-off on age-gating claims? | Buyer / legal champion |

**Do not promise** Abraxas satisfies any jurisdiction's legal requirements.

### E. Integration stack (~3 min)

| Question | Why we ask |
|----------|------------|
| Custom checkout, Shopify, mobile app, or hybrid? | Integration effort |
| Can your backend call HTTPS APIs and verify a signed receipt server-side? | Partner Flow model — OpenAPI |
| Who would own the engineering integration? | **Proposed question** |

### F. Buyer and timeline (~2 min)

| Question | Why we ask |
|----------|------------|
| Who signs a pilot agreement — product, engineering, legal, or all three? | Sales cycle |
| Target date for a gated flow in production or staging? | **Proposed target** |
| Any blackout periods (fundraise, audit, holiday freeze)? | **Proposed question** |

### G. Pilot success metrics (~2 min)

| Question | Why we ask |
|----------|------------|
| If we ran a **proposed 30-day paid pilot**, what would success look like? | Align on KPIs |
| Suggested metrics: time-to-verify, conversion lift, manual review hours saved | `docs/commercial/PILOT_PROGRAM_CHARTER.md` L89; `lib/designPartnerOutreach.ts` L27–28 |

---

## Product explanation (3 min) — factual only

> "Holders complete verification once in Abraxas Passport. Your site redirects into Partner Flow; after consent, we evaluate your published policy and return a signed decision receipt to your callback URL. Your server verifies the receipt — we document a public verification endpoint in our OpenAPI contract.
>
> Partners receive derived fields like `identity_verified` and, when your policy includes it, `over_21`. That boolean is **policy-derived in our current implementation — it is not extracted from date of birth on the ID**, and it is **not** something we represent as legally sufficient or regulatory-grade age verification. Counsel is helping us define merchant-facing claim language.
>
> The current partner-output sanitizer is designed to exclude raw document fields and DOB keys — see our published Partner Flow contract."

**Verified in repo:** `lib/partner/partnerVerificationResult.ts` L65–66, L20–27; `docs/VERIFICATION_V1_AUDIT.md` L98.

---

## Beta limitations disclosure (2 min) — required

Read or paraphrase:

| Topic | Script line |
|-------|-------------|
| Beta stage | "Abraxas is beta-stage. This is not a certified or audited product." |
| Security review | "Abraxas is seeking an independent security review. Independent security review is planned and not yet completed." — `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` L3 |
| Contract | "Any pilot requires counsel-approved agreement. Pricing and support are subject to mutual agreement." |
| No SLA | "We do not offer a contractual SLA during beta." — `docs/commercial/BETA_SERVICE_LEVEL_APPENDIX.md` |
| Entitlements | "Commercial metering is observe-only today — no billing enforcement." — `lib/partner/partnerEntitlements.ts` L1–2, L35 |
| Cannabis | "Our initial wedge is age-gated digital commerce broadly — not cannabis-specific retail as the first legal scope." |

---

## Close (2 min)

> "Based on what you shared, [fit / not a fit / needs legal review first]. I'll send our one-page pilot summary. If there's mutual interest, next step is a technical deep-dive and an application at abraxasworld.xyz/integrations. We'll only proceed to a **proposed 30-day paid pilot** after counsel-approved contract terms."

**Verified in repo:** `app/integrations/`; `app/design-partner/page.tsx`.

---

## Disqualifiers (internal)

| Signal | Action |
|--------|--------|
| Requires certified age verification or DOB extraction today | **Requires external validation** — likely not fit until product/counsel evolves |
| Needs cannabis-specific legal clearance as first pilot | Defer; not initial scope |
| Expects SOC 2 / PCI attestation now | Explain gap honestly |
| No engineering owner for server-side receipt verification | Revisit after resourcing |

---

## Post-call notes template (operator-filled)

| Field | Notes |
|-------|-------|
| Company | |
| Contact / role | |
| Use case (age-gated digital commerce) | |
| Jurisdictions | |
| Current friction | |
| Manual review hours/week | |
| Integration stack | |
| Success metrics agreed | |
| Legal/compliance involved? | |
| Fit (Y/N/Maybe) | |
| Next step | |
