# Cross-Industry Compliance Architecture

Abraxas is a **reusable, policy-driven assurance platform**. Good Trouble (`good-trouble-retail-v1`) is the first relying-partner implementation using shared primitives—not a cannabis-specific rewrite.

## Separable concepts

| Concept | Meaning | Never conflated with |
|---------|---------|----------------------|
| **Authentication** | Account control (Google/zkLogin, wallet binding) | Age, identity, or eligibility |
| **Identity evidence** | Authoritative source checked (IDV vendor, manual review) | Partner access decision |
| **Eligibility** | Policy requirement satisfied (claims + assurance) | Authentication |
| **Partner decision** | Relying partner grants access after receipt validation | URL parameters or client storage |
| **Transaction-time obligations** | In-store pickup, delivery, POS checks | Reusable credential alone |

## Shared primitives

| Primitive | Location |
|-----------|----------|
| Evidence | `lib/assurance/ageEvidence.ts`, `lib/assurance/providerAdapter.ts` |
| Claims | `lib/credentials/claimSchema.ts` |
| Credentials | `lib/idv/issueIdentityCredential.ts` |
| Assurance levels | `lib/assurance/eligibilityAssurance.ts` |
| Policies (versioned) | `partner_policies` + `lib/policy/getPolicy.ts` |
| Policy evaluation | `lib/policy/evaluatePolicy.ts`, `evaluateSubjectPolicy.ts` |
| Compliance registry | `lib/assurance/compliancePolicyRegistry.ts` |
| Consent / purpose | Partner flow consent gate, `capturePolicyContext.ts` |
| Decisions + receipts | `lib/decisionReceipts/`, `lib/partner/relyingPartyFlow.ts` |
| Expiration / revocation | `lib/trust/credentialStatusRegistry.ts` |
| Audit events | `identity_review_audit_log`, partner flow audit |
| Manual review | `lib/idv/adminReviewService.ts` |
| Data retention | Privacy ledger migrations (060+), operator-configured |

## Policy configuration dimensions

Operators configure per policy version (stored in immutable `rules_json`):

- Industry, jurisdiction, product/service, transaction type, risk level
- Required evidence source and assurance level
- Credential freshness (`max_age_hours`, `expires_at`)
- Transaction-time verification flags (metadata + assurance boundary)
- Retention rules and partner restrictions

**Canonical production source:** published `partner_policies` rows. Sandbox pilot overlay (`resolveEffectivePolicyRules`) applies only to an explicit allowlist when `sandbox_only === true` and does **not** replace operator publication.

## Good Trouble as one policy configuration

`good-trouble-retail-v1` uses:

- Standard claims: `identity_verified`, `liveness_passed`, `wallet_binding_confirmed`, `residency_country`
- Age eligibility: `product_eligibility=over_21` (sandbox overlay / v2 draft)
- Biometric thresholds in `rules_json` (partner-specific metadata, not engine hard-coding)
- Transaction-time merchant obligation surfaced in `assuranceBoundary.ts`

No cannabis logic lives in `evaluatePolicyRules` core paths.

## Privacy by design

- Data minimization: partner receipts exclude DOB, images, OAuth subjects (`partnerVerificationResult.ts`)
- Selective disclosure: `sanitizeClaimForPartner()` in policy evaluation
- Purpose limitation: evidence adapters require `purpose` field
- No cross-partner correlation in receipts without explicit consent
- Age evidence table stores hashes only—no raw documents

## Operator / legal boundary

| Abraxas enforces | Operator or counsel approves |
|------------------|------------------------------|
| Stored policy versions | Legal sufficiency per industry |
| Claim provenance at issuance | Jurisdiction allow/block lists |
| Fresh partner-bound evaluation | Evidence vendor authorization |
| Receipt crypto binding | Retention/deletion schedules |
| Fail-closed on missing evidence | Production policy publish |
| Audit immutability | Transaction-time merchant policy |

**Do not encode unsupported legal conclusions in source code.**

## Migration 078 backward compatibility

`age_evidence_records` is an **audit ledger**, not required for credential issuance. When the table is missing (pre-migration deploy):

- `createAgeEvidenceRecord()` returns `{ ok: false, storage_unavailable: true }`
- Issuance and operator approval continue (fail-open for ledger only)
- Operator review remains available; evidence linkage is deferred until migration applies

## Tests

`lib/assurance/crossIndustryCompliance.test.ts` proves cross-industry guards. See PR #257 release gate evidence.
