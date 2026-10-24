# Build #818 — Trust distribution and independent verifier

**Baseline:** PR **#817 merged** · Production unchanged

## 1. Trust-anchor distribution

| Artifact | Document id | Trust establishment |
|----------|-------------|---------------------|
| Trust anchor bundle | `abraxas_trust_anchor_bundle` v1 | **Out-of-band** pin (`distribution: out_of_band`) |
| Signed issuer authority statement | `abraxas_issuer_authority_statement` v1 | Ed25519 signature under **pinned** anchor public key |
| Receipt status evidence | `abraxas_receipt_status_evidence` v1 | Institution-operated freshness adapter (not self-authenticating from HTTPS) |

Builder: `lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle.ts`

Standalone verifier: `packages/abraxas-independent-verifier/`

Example RP CLI: `examples/independent-sias-verifier/verify.ts`

## 2. Independent verifier contract

`verifyAbraxasReceiptIndependently` returns explicit phases and separates:

- `cryptographically_authentic`
- `issuer_currently_authorized`
- `policy_and_audience_match`
- `currently_acceptable` — `yes` | `no` | `indeterminate` (requires status evidence)

HTTPS fetch of SIAS **does not** establish trust. Verifiers reject anchor substitution, fingerprint mismatch, registry rollback, and stale statements (cache max-age on bundle).

## 3. Claims and evidence parity (sovereign slice)

Tables: `sovereign_claim_status`, `sovereign_evidence_sources`, `sovereign_receipt_evidence_dependencies`

Evaluation: `verticalSlice/claimEvidenceRead.ts` integrated into `evaluateSovereignCurrentValidity`.

No holder PII copied into staging fixtures.

## 4. Remaining external trust dependencies

- Integrator must pin anchor bundle and operate status-evidence freshness policy
- Production PostgREST paths remain authoritative outside the sovereign slice
- External sovereign staging attestation (#816) still required for operational ownership proof

## 5. Tests

- `packages/abraxas-independent-verifier/src/independentVerifier.adversarial.test.ts`
- `lib/persistence/boundary/independentVerifierHarness.test.ts`
- CI: `sovereign-operational-proof` job + independent verifier vitest

## 6. Next measurable milestone

Publish production-grade anchor bundle + SIAS rotation playbook on a **verifier-trustable channel** (pinned digest + HTTPS document), then external sovereign staging recovery drill under attestation gate.

## 7. Production restrictions

Unchanged — no Production anchor deployment, SQL migrations, auth, or billing.
