# Claim Matrix — Protocol Contract

**Document type:** Backend wiring contract  
**Status:** Active — audit against `lib/policy/productionPolicyContract.ts`  
**Last updated:** 2026-07-31

This matrix maps every claim from issuance through consumption. It is the protocol contract for backend validation before Institutional Acceptance Testing (IAT).

## Legend

| Column | Meaning |
|--------|---------|
| **Issued** | Code path that creates the claim |
| **Stored** | Persistent table |
| **Resolved** | How active claims are loaded for a subject |
| **Evaluated** | Where policy rules check the claim |
| **Consumers** | Partner policies or services that require it |
| **Tests** | Regression coverage |

---

## Claims required by production partner policies

| Claim | Issued | Stored | Resolved | Evaluated | Consumers | Tests |
|-------|--------|--------|----------|-----------|-----------|-------|
| `identity_verified` | `abraxasCaptureApprovedClaims`, `manualApprovedClaims`, `veriffApprovedClaims` | `credential_claims` | `getActiveClaims` | `evaluatePolicyRules` | GT retail, booking, RWA, sandbox gate, verified participant | `claimSchema.test.ts`, `goodTroubleRetailWiring.integration.test.ts` |
| `liveness_passed` | Same IDV paths | `credential_claims` | `getActiveClaims` | `evaluatePolicyRules` | GT retail, booking, RWA, verified participant | `goodTroubleRetailWiring.integration.test.ts` |
| `wallet_binding_confirmed` | `walletBindingClaim` (zkLogin L2), `walletAuthority` SIWE (L3) | `credential_claims`, `wallet_bindings` | `getActiveClaims` | `evaluatePolicyRules` | GT retail, booking, RWA, Cielo, sandbox gate, verified participant | `goodTroubleRetailWiring.integration.test.ts`, `verifiedGuestPolicy.test.ts` |
| `residency_country` | Same IDV paths (`residencyCountryClaim`) | `credential_claims` | `getActiveClaims` → `claim_value.country` | `evaluatePolicyRules`, `loadPolicyTrustContext` | **GT retail only** | `claimSchema.test.ts`, `goodTroubleRetailWiring.integration.test.ts` |
| `screening_outcome` | Same IDV paths (default: `pending_partner_screen`) | `credential_claims` | `getActiveClaims` | `evaluatePolicyRules` | RWA (`must_equal: clear`), sandbox gate | `evaluatePolicy.test.ts` |
| `asset_ownership_reviewed` | **Not implemented** | — | `getActiveClaims` | `evaluatePolicyRules` | GT batch (sandbox pilot) | — |

---

## Claims issued but not standalone policy requirements

| Claim | Issued | Notes |
|-------|--------|-------|
| `government_id_verified` | IDV paths | Bundled with identity verification; not a separate policy gate today |

---

## Partner policies

| Policy ID | Partner | Sandbox | Required claims | Notes |
|-----------|---------|---------|-----------------|-------|
| `abraxas-core-v1` | abraxas | No | none (`allow_core_only`) | Browse / account |
| `abraxas-booking-v1` | abraxas | No | identity, liveness, wallet | |
| `abraxas-rwa-us-v1` | abraxas | No | identity, liveness, screening (clear), wallet | Screening not clear at IDV — manual_review expected |
| `abraxas-verified-participant-v1` | abraxas | No | identity, liveness, wallet | |
| `cielo-verified-guest-v1` | cielo | No | wallet (L3) | Account/consent in typed contract; profile/identity_optional in DB JSON only (see below) |
| `partner-sandbox-gate-v1` | abraxas-partner-sandbox | Yes | identity, wallet, screening (clear) | Demo sandbox |
| `good-trouble-retail-v1` | good-trouble-cannabis | Yes | identity, liveness, wallet, **residency** | Primary IAT path |
| `good-trouble-batch-v1` | good-trouble-cannabis | Yes | asset_ownership_reviewed | **Blocked:** claim not issued |

---

## Policy flags (enforced outside `evaluatePolicyRules`)

| Flag | Enforced by |
|------|-------------|
| `account_required` | Partner flow / `evaluateCieloVerifiedGuest` |
| `consent_required` | Partner flow consent gate / `evaluateCieloVerifiedGuest` |
| `minimum_age` | `buildPartnerVerificationResult` (`over_21`) |
| `session_receipt_hours` | `computeSessionReceiptExpiresAt` |
| `product_eligibility_action` | `createVerificationRequest` |
| `biometric_thresholds` | `resolveCapturePolicy` / `analyzeCapture` |
| `blocked_jurisdictions` | `evaluatePolicyRules` |
| `sandbox_only` | `evaluatePolicyRules` (`decision_context`) |

### Cielo DB-only flags (not in `PartnerPolicyRules` TypeScript contract)

Present in migrations `026` / `032` `rules_json` for `cielo-verified-guest-v1`, enforced in `evaluateCieloVerifiedGuest` only:

| Flag | Enforced by |
|------|-------------|
| `profile_required` | `evaluateCieloVerifiedGuest` (`hasCompleteProfile`) |
| `identity_optional` | `evaluateCieloVerifiedGuest` (skips identity credential requirement) |

---

## Known contract gaps (post P0)

| Gap | Severity | Policy | Status |
|-----|----------|--------|--------|
| `residency_country` never issued | **P0 — fixed** | `good-trouble-retail-v1` | Fixed in `claimSchema.ts` |
| `asset_ownership_reviewed` not issued | P2 (sandbox pilot) | `good-trouble-batch-v1` | Not in IAT scope |
| `screening_outcome` defaults to `pending_partner_screen` | Expected | RWA, sandbox gate | Manual review by design until partner screening |

---

## Audit command

```bash
npm test -- lib/policy/claimContractAudit.test.ts lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts lib/credentials/claimSchema.test.ts
```

Canonical source: `lib/policy/productionPolicyContract.ts`
