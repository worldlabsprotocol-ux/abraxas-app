# Build #546 — Trust architecture audit (implementation trace)

Repository: `worldlabsprotocol-ux/abraxas-app` · Observation: code trace on `main` post–PR #667.

## Receipt issuance

| Control | Status | Location |
|--------|--------|----------|
| Canonical payload + schema version | Implemented | `lib/decisionReceipts/canonical.ts`, `types.ts` |
| Ed25519 signing (server-only) | Implemented | `lib/decisionReceipts/signing.ts`, `service.ts` |
| Idempotent issuance | Implemented | `lib/decisionReceipts/service.ts` |
| Public/partner views (no PII) | Implemented | `lib/decisionReceipts/views.ts` |

## Cryptographic signing & issuer authority

| Control | Status | Location |
|--------|--------|----------|
| Payload hash + detached signature | Implemented | `signing.ts` |
| Verification key registry (env) | Implemented | `lib/decisionReceipts/verificationKeyLifecycle/` |
| Key rotation / retire / historical verify window | Implemented | `resolve.ts` |
| Public key document API | Implemented | `app/api/receipts/verification-keys/route.ts` |

## Policy evaluation & provenance

| Control | Status | Location |
|--------|--------|----------|
| Policy rules evaluation | Implemented | `lib/policy/evaluatePolicy.ts` |
| Evaluated claim refs (no raw values) | Implemented | receipt canonical payload |
| Partner/policy binding on verify | Implemented | `lib/partner/verifyPartnerFlowReceipt.ts` |
| Trust evaluation (fail-closed) | Implemented | `lib/decisionReceipts/trustEvaluation.ts` |

## Expiration, freshness, revocation

| Control | Status | Location |
|--------|--------|----------|
| `expires_at` + status resolution | Implemented | `views.ts`, `validityResolver.ts` |
| Current validity contract | Implemented | `lib/decisionReceipts/currentValidity/` |
| Revocation control plane | Implemented | `lib/decisionReceipts/revocationControlPlane.ts` |
| Live re-fetch expectation for partners | Documented | `verifyPartnerFlowReceipt.ts`, partner kit |

## Independent verification

| Control | Status | Location |
|--------|--------|----------|
| Local signature verify | Implemented | `signing.ts`, `verificationKeyLifecycle/resolve.ts` |
| Public receipt HTTP surface | Implemented | `app/api/receipts/[id]/public` |
| Integrity diagnostics | Implemented | `receiptIntegrityDiagnostics.ts` |
| **Build #546 standalone verifier** | **Added** | `lib/institutionalCertification/build546/independentVerifier.ts` |

## Cross-application reuse & audience

| Control | Status | Location |
|--------|--------|----------|
| Partner-scoped pseudonym / pairwise refs | Implemented | `lib/identity/pairwiseSubject/` |
| Partner ID binding on receipt | Implemented | canonical payload |
| Audience binding (RP partner id) | **Build #546** | `independentVerifier.ts` |

## Cross-chain evidence

| Control | Status | Location |
|--------|--------|----------|
| EVM eligibility verifier contract | Implemented | `contracts/evm-eligibility-verifier/` |
| Solana eligibility gate + verifier SDK | Implemented | `solana/abraxas-eligibility-gate/` |
| Conformance vectors (offline) | Implemented | `lib/partner/onchainVerifierConformance/` |
| Live RPC observation | Partial / environment-dependent | partner adapters |

## Gaps (explicit)

- **Live institutional holder journey** requires authorized staging credentials and isolated Supabase — not simulated by local fixtures.
- **Claim dependency refresh** and **supersession** require Abraxas authority APIs/DB — offline verifier marks these as live-only.
- **Production certification** is not inferred from passing local adversarial tests (see Build #546 disclaimer).
