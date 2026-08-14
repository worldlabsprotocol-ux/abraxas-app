# Third-party service inventory v1

| Field | Value |
|-------|-------|
| **Status** | Draft v1 · beta-stage · engineering-owned · **not legal advice** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Purpose

This document is a **factual inventory** of third-party services referenced in the Abraxas repository. It is **not** a subprocessor list, DPA annex, or legal classification of data-processing roles.

**Every entry below requires operator and counsel confirmation** for production enablement and legal role unless your deployment records prove otherwise outside this repository.

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Service name appears in cited code or documentation. |
| **Requires operator and counsel confirmation** | Default for production role, data categories, and subprocessor status. |

---

## How to read the tables

| Column | Description |
|--------|-------------|
| **Service function** | What the integration does in Abraxas, per repo evidence. |
| **Data categories (high level)** | Illustrative only; not a legal data map. |
| **Evidence** | Repository paths. |
| **Production status** | Always **requires operator and counsel confirmation** in this draft. |

---

## Section A — Potential subprocessors / data-processing providers

**Operator and counsel confirmation required** before treating any row as a contractual subprocessor.

| Provider | Service function | Data categories (high level) | Evidence in repo | Production status |
|----------|------------------|------------------------------|------------------|-------------------|
| **Supabase** | PostgreSQL database, authentication, object storage (including `passport-documents` bucket) | Account data, verification records, documents, audit tables, partner configuration | `README.md` L71; `app/legal/privacy/page.tsx` L91–92; `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md` L14–23 | **Requires operator and counsel confirmation** |
| **Vercel** | Application hosting and deployment for Next.js | Request metadata, application logs (deployment-specific) | `README.md` L72; `lib/securityProgram.ts` (third-party infrastructure out of bug-bounty scope) | **Requires operator and counsel confirmation** |
| **Google OAuth** | zkLogin sign-in (Google account → Sui holder address) | Email, OAuth identifiers, derived wallet address | `app/legal/privacy/page.tsx` L46–48 | **Requires operator and counsel confirmation** |
| **Veriff** (when enabled) | Third-party IDV when `IDV_PROVIDER=veriff` | Government ID and liveness per Veriff; Abraxas receives decision result per privacy policy | `lib/idv/idvProvider.ts` L6–15; `lib/veriff.ts`; `app/legal/privacy/page.tsx` L49–52 | **Requires operator and counsel confirmation** — default code path is `manual` (Abraxas Verify), not Veriff |
| **Resend** (when enabled) | Operational alert email (e.g. partner webhook alerts) when `RESEND_API_KEY` is set | Email addresses of operational recipients; alert metadata (no holder PII in webhook alert contract) | `lib/notify/adminResend.ts`; `docs/PARTNER_WEBHOOKS.md` L20–21 | **Requires operator and counsel confirmation** |
| **Upstash** (when enabled) | Partner Flow rate limiting when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set | Rate-limit keys derived from request context (no PII in rate-limit design per `docs/PARTNER_FLOW_RATE_LIMITS.md`) | `lib/partner/partnerFlowUpstashStore.ts`; `docs/PARTNER_FLOW_RATE_LIMITS.md` | **Requires operator and counsel confirmation** — optional; in-memory fallback when unset |

---

## Section B — Other integrations, networks, or payment providers

**Not classified here as subprocessors.** Role and data flow require **operator and counsel confirmation**.

| Provider | Service function | Evidence in repo | Production status |
|----------|------------------|------------------|-------------------|
| **Stripe** | Payment checkout and webhook processing when Stripe env vars are configured | `app/api/payments/webhook/route.ts`; `components/payments/PaymentButton.tsx` | **Requires operator and counsel confirmation** |
| **MoonPay** | Referenced as out-of-scope third-party in security review materials | `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md` | **Requires operator and counsel confirmation** |
| **HeroSwap** | Swap feature third party | `app/legal/privacy/page.tsx` L92–93 | **Requires operator and counsel confirmation** |
| **Sui network** | On-chain wallet addresses and Passport stamp bitmask | `app/legal/privacy/page.tsx` L96–98; `README.md` L21–22 | **Requires operator and counsel confirmation** — public blockchain |
| **Solana network** | SPL $ABRA token infrastructure (optional access tiers) | `README.md` L22 | **Requires operator and counsel confirmation** |

---

## Classification disclaimer

- **Section A** lists providers that *may* process personal data depending on production configuration.
- **Section B** lists payment, swap, or chain infrastructure that this engineering inventory does not label as subprocessors.
- **Only counsel** may determine controller, processor, and subprocessor roles for contracts and privacy notices.

---

## Gaps

| Gap | Notes |
|-----|-------|
| No `/legal/subprocessors` page | **Verified in repo** — no dedicated subprocessor route in `app/legal/`. |
| No contractual subprocessor exhibit | External next step — counsel. |
| Production env not in git | Operator must confirm which Section A/B services are enabled on `https://abraxasworld.xyz`. |

---

## Reconciliation procedure (operators)

1. Export production environment variable names (server-only) and compare to Section A/B.
2. Confirm active IDV path: `lib/idv/idvProvider.ts` defaults to `manual`; Veriff requires explicit `IDV_PROVIDER=veriff`.
3. Provide inventory to counsel for DPA/subprocessor annex drafting — **do not** treat this file as that annex.
4. Update this document and the **Base** SHA when `origin/main` changes provider references.

---

## External next steps

| Action | Owner |
|--------|-------|
| Subprocessor annex for customer contracts | Counsel |
| Align consumer privacy policy with active IDV path | Counsel + operator |
| Confirm production provider enablement | Operator |
