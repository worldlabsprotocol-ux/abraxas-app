# Partner Sandbox Demo — Phase 1 presenter script

**Audience:** Investors and commercial partners  
**Duration:** ~5 minutes  
**Route:** `/admin/partner-sandbox-demo` (admin PIN + `PARTNER_SANDBOX_DEMO_ENABLED=true` on server only)

## Before you begin

- Confirm `PARTNER_SANDBOX_DEMO_ENABLED=true` (exact trimmed lowercase `true`) on the **server** only.
- Confirm `PARTNER_SANDBOX_DEMO_SUBJECT_ID` points to a **pre-provisioned synthetic sandbox Passport** with required sandbox claims. This demo does **not** create credentials or bypass identity verification.
- Use partner **`abraxas-partner-sandbox`** and policy **`partner-sandbox-gate-v1`** only.
- The sandbox policy has **no `minimum_age` rule** — do not describe an age gate in this walkthrough.

## Opening (30 seconds)

> "This is a synthetic sandbox demonstration of how an approved partner obtains a privacy-minimized eligibility decision from an Abraxas Passport. Synthetic sandbox holder using the same policy evaluation and signed-receipt implementation — not a separate demo stack. No real investor identity, no ID documents, and no external customer record is represented."

## Step 1 — Demo Passport (45 seconds)

**Action:** Enter admin PIN → **Run step** on "Demo Passport."

**Say:**

> "Here is our pre-provisioned synthetic sandbox holder. We only show credential availability and which sandbox claim types are present — never legal name, date of birth, document images, biometrics, or wallet addresses."

Point out:

- Label: *Synthetic sandbox holder*
- Credential status (active / missing)
- Required claim types: `identity_verified`, `wallet_binding_confirmed`, `screening_outcome`

## Step 2 — Partner policy request (30 seconds)

**Say:**

> "An approved sandbox partner asks a scoped question: Is this holder verified and eligible under this policy? This sandbox policy does not include a minimum age rule."

## Step 3 — Evaluate (60 seconds)

**Action:** **Run step** on evaluation.

**Say:**

> "Abraxas evaluates the policy using the same engine used in Partner Flow. The response includes the decision, reason codes, and any missing claims — still without exposing the holder's identity record."

Highlight:

- `decision` (approved / denied / manual_review)
- `decision_context: sandbox_only`
- `production_usable: false`

## Step 4 — Complete and issue receipt (60 seconds)

**Action:** **Run step** on complete.

**Say:**

> "When eligible, we issue a signed decision receipt through the existing Partner Flow receipt service. The partner receives decision metadata and a receipt identifier — not a copy of the Passport or underlying identity documents."

**Do not claim metering or webhook delivery success.** If asked about operational hooks, say only:

> "Operational metering and notification hooks run through the existing Partner Flow infrastructure. Delivery evidence is not displayed in this Phase 1 demonstration."

**Repeat demonstrations:** Phase 1 reuses the existing receipt on repeated Complete requests (idempotent replay). A fixture-reset capability remains Phase 2.

## Step 5 — Public validation (60 seconds)

**Action:** Validation runs automatically after issuance (or re-run validate).

**Say:**

> "Any relying party can validate the receipt through the public receipt endpoint. We show only the decision, policy and receipt identifiers, timestamps, signature validity, and current validity status — not the raw signature bytes."

Point out:

- `signature_valid: true`
- `currently_valid` (live trust evaluation)
- `invalidation_reasons` if applicable

## Close (30 seconds)

> "This walkthrough used synthetic sandbox data and production Abraxas infrastructure: policy evaluation, signed receipts, and public validation. Operational metering and notification hooks run through the existing Partner Flow infrastructure, but delivery evidence is not shown in Phase 1. It is an internal sandbox demonstration and does not represent an external partner integration or a real eligibility decision."

## Explicit disclosures (if asked)

| Topic | Honest answer |
|-------|----------------|
| Real identity documents? | No — synthetic pre-provisioned sandbox holder only |
| Age gate? | Not claimed — sandbox policy has no `minimum_age` |
| External partner integration? | No — internal sandbox demonstration |
| PII shared with partner? | The partner-facing result is designed to exclude identity documents and unrelated personal information. |

## Phase 2 (not in this script)

- Receipt revocation demonstration button
- Resettable demo fixtures endpoint
- Public partner-facing sandbox page
- Partner callback redirect flow
- Live webhook delivery to external endpoint (with redacted viewer)
