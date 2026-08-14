# Data responsibility matrix

| Field | Value |
|-------|-------|
| **Status** | Draft · beta-stage · engineering-owned · **not legal advice** |
| **Base** | `origin/main` at `136bac31be96b90845e0a6c62852ef315e76a871` |
| **Last reconciled** | 2026-08-13 |

## Boundary statement (required)

**This is a technical-flow description only. It does not determine controller, processor, biometric-data, custody, or regulatory roles.**

Counsel must assign legal roles separately. This document does not state that Abraxas is compliant, certified, or approved for any regulated use case.

## Fact tiers

| Label | Meaning |
|-------|---------|
| **Verified in repo** | Supported by cited path. |
| **Planned / partial** | Documented but not fully enforced in production. |
| **Requires operator and counsel confirmation** | Production IDV path and provider roles. |
| **Requires external validation** | Independent review of security and privacy controls. |

---

## Descriptive roles (non-legal)

| Role | Description |
|------|-------------|
| **Holder** | End user completing Passport / Partner Flow verification in a browser session. |
| **Relying partner** | Merchant or platform integrating Partner Flow; the documented partner-output path returns derived claims and signed receipts — the current partner response contract excludes raw ID images. |
| **Abraxas** | Trust and authorization layer — policy evaluation, credential issuance, signed decision receipts. Not a KYC provider per `README.md` L7–8. |
| **Third-party IDV (Veriff)** | Optional path when `IDV_PROVIDER=veriff` — `lib/idv/idvProvider.ts`. |

---

## IDV path comparison

| Dimension | Abraxas-native (`IDV_PROVIDER=manual`, default) | Veriff (`IDV_PROVIDER=veriff`) |
|-----------|---------------------------------------------------|--------------------------------|
| **Capture data handling** | **The Abraxas-native implementation may receive and store capture data, depending on configured production path.** Evidence: `app/api/identity/documents/capture/route.ts`; storage in `passport_documents` and bucket `passport-documents` — `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md` L19–20. | Veriff collects government ID and liveness per `app/legal/privacy/page.tsx` L50–52; Abraxas receives a verification result, not underlying images (privacy policy wording). |
| **Default in code** | **Verified in repo:** `lib/idv/idvProvider.ts` L10–15 returns `manual` when unset. | Opt-in only via `IDV_PROVIDER=veriff`. |
| **Issuance attribution** | `lib/idv/issueIdentityCredential.ts` — providers `manual`, `abraxas_capture` / `abraxas_independent`. | Provider `veriff` — same file L30, L114. |
| **Partner-facing output** | Derived claims + signed receipt; sanitization strips forbidden PII keys — `lib/partner/partnerVerificationResult.ts` L20–28, L41–69. | Same partner output contract regardless of IDV path. |
| **Privacy policy alignment** | **Gap (requires counsel review):** policy §1 emphasizes Veriff for Precheck (`app/legal/privacy/page.tsx` L49–54) while native path stores documents "reviewed by our team." | Policy describes Veriff collection explicitly. |
| **Production path** | **Requires operator and counsel confirmation** | **Requires operator and counsel confirmation** |

---

## Data element matrix

Deletion behavior summarized from `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` (engineering documentation, not legal compliance statement).

| Data element | Primary stores (verified) | Shared with partner? | Deletion / retention status |
|--------------|---------------------------|----------------------|----------------------------|
| Government ID image | `passport_documents`; Storage `passport-documents` — `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md` | The documented partner-output path does not include raw document files; derived claims only via `buildPartnerVerificationResult` | Holder deletion request → access revoke; **blobs not purged** — `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` L15–26 |
| Selfie / biometric assessment signals | `identity_biometric_assessments`; capture APIs — `docs/VERIFICATION_V1_AUDIT.md` | The current partner response contract excludes raw biometric fields (`FORBIDDEN_KEYS` in `partnerVerificationResult.ts`) | Retention constants in `lib/idv/biometric/captureGuard.ts`; **purge cron planned, not implemented** — `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` L28–35 |
| Email / OAuth identity | zkLogin tables; Google OAuth — privacy policy L46–48 | The documented partner-output path does not include email or OAuth identifiers in the receipt payload | `sui_zklogin_identities` — no purge RPC — `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` L25 |
| Wallet address | Sui address; optional on-chain stamp | Binding ref in receipts may appear | On-chain data public by design — privacy policy L96–98 |
| Verification decision | `identity_verifications`, `verification_decisions` | Decision outcome via Partner Flow | Revoked on approved deletion workflow; audit tables retained |
| Signed decision receipt | `decision_receipts` | Yes — partner-scoped proof | Immutable record; revocation changes validity, not deletion — `docs/TRUST_MODEL_V1.md` §10.2 |
| Audit / metering | `audit_events`, partner metering — `lib/partner/partnerMetering.ts` L1–2 (no PII) | Partner metering ledger is designed without PII fields; not exposed via the documented partner-output API | Retained for ops evidence |

---

## Age and eligibility claims

| Topic | Engineering fact | What we do **not** claim |
|-------|------------------|---------------------------|
| Policy rule | Partners may configure `minimum_age` in policy rules — `lib/policy/types.ts` L50–51. | Not a substitute for counsel-approved merchant compliance program. |
| Partner field `over_21` | Set when decision is `approved` and `minimumAge` is null or `identityVerified && minimumAge >= 21` — `lib/partner/partnerVerificationResult.ts` L65–66. | **Not DOB-derived.** No date-of-birth parsing in this function. |
| Biometric engine | `retail_minimum_age: 21` in policy JSON is **not enforced by the biometric engine** — `docs/VERIFICATION_V1_AUDIT.md` L98. | Not biometric proof of age. |
| Regulatory sufficiency | — | `over_21` is **not** legally sufficient, regulatory-grade, or compliance-approved. Outcomes depend on configured policy and underlying verification evidence. |

The current partner-output sanitizer is designed to exclude forbidden keys including `date_of_birth` — `sanitizePartnerPayload` / `FORBIDDEN_KEYS` in `lib/partner/partnerVerificationResult.ts` L20–27. Mis-wiring or future API changes could alter this; integrators should verify against the published Partner Flow contract.

---

## Partner payload sanitization

**Verified in repo:** `sanitizePartnerPayload` removes keys such as `date_of_birth`, `passport_image`, `selfie`, `biometric`, `legal_name`, `document_number`, `address` — `lib/partner/partnerVerificationResult.ts` L20–38.

---

## Privacy control plane (holder requests)

| Capability | Status | Evidence |
|------------|--------|----------|
| Holder privacy request ledger | **Verified in repo** | `lib/privacy/privacyControlPlane.ts`; migrations `060`–`061` |
| Admin-approved deletion workflow | Revokes access; does not purge all stores | `docs/PRIVACY_RETENTION_PURGE_LIMITATIONS.md` L5–13 |
| Automated DSAR export package | **Planned / partial** | Runbook describes manual fulfillment — `docs/PRIVACY_DATA_LIFECYCLE_RUNBOOK.md` |

---

## External next steps

| Action | Owner |
|--------|-------|
| Controller / processor determination | Counsel |
| Align `app/legal/privacy/page.tsx` with active production IDV path | Counsel + operator |
| Implement purge worker or update privacy claims | Engineering (planned) + counsel review |
