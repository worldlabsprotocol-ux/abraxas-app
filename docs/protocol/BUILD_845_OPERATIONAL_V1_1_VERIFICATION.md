# Build #845 — Operational v1.1.0 verification and sovereign receipt persistence

## Operational trust paths (server)

Server-only modules enforce full v1.1.0 canonical signature verification and signed-field integrity:

| Module | Role |
|--------|------|
| `receiptSignatureVerify.server.ts` | Operational Ed25519 + payload hash (v1.1 canonical) |
| `views.server.ts` | Public views with operational signature verify |
| `validityResolver.server.ts` | Live validity + v1.1 sidecar/dedicated-field integrity |
| `trustEvaluation.server.ts` | Trust gates on operational validity |
| `v1_1_0/operationalIntegrity.server.ts` | Sidecar decode, pending rejection, persistence mismatch |

**Routed to server modules:** `service.ts`, `currentValidity/evaluate.ts`, partner `relyingPartyFlow`, `narrowPartnerResult`, `getTrustDecision`, connect authorization, admin/status API routes.

**Client-safe (unchanged):** `trustEvaluation.ts`, `views.ts`, `resolve.ts` — v1.1.0 signatures return `false` (fail-closed). Browser demos must not import `*.server.ts` or `@abraxas/independent-verifier` runtime.

## Migration 152 persistence contract

Pure rules live in `lib/decisionReceipts/v1_1_0/dedicatedPersistence.ts` and are enforced by `assertV11OperationalIntegrity` and `attachV11FieldsFromSidecar` (canonical signing / verification).

| State | Detection | Operational behavior |
|-------|-----------|----------------------|
| Column **absent** | Key not on DB row | Legacy sidecar-only; no dedicated vs sidecar parity check |
| Column **present, null**, phase not **final** | Migration 152 applied, backfill pending | Sidecar remains authoritative for canonical hash/signature; null vs non-null sidecar is **not** a mismatch |
| Column **present, non-null** | Partial or full backfill | Dedicated value must match signed sidecar (including null vs non-null) |
| Column **present**, phase **final** | Finalized v1.1.0 row | Dedicated values must match signed sidecar exactly; null dedicated vs signed non-null **fails closed** |
| Contradiction | Any enforced state | `application_binding_persistence_mismatch`, `evidence_commitment_persistence_mismatch`, or `evidence_commitment_manifest_persistence_mismatch` |

`mapReceiptRow` records raw dedicated column values plus `v11_dedicated_persistence` (column presence + issuance phase). Verification resolves the authoritative signed field via `resolveAuthoritativeV11Field`; it does not treat an unbackfilled SQL `NULL` as an authoritative empty binding.

## Legacy sidecar compatibility

Until migration `152_decision_receipt_v1_1_signed_fields.sql` is applied:

- **Write path:** v1.1.0 signed metadata remains in `anchor_reference` sidecar (`abraxas.receipt.v1_1.sidecar/v1`).
- **Read path:** `mapReceiptRow` hydrates from sidecar when column keys are absent; when keys exist, dedicated storage is preserved on the record for integrity checks.

External `anchor_reference` values that are not sidecars remain reserved for partner/chain anchors.

## Migration 152 (proposal only)

Adds `application_binding_ref`, `evidence_commitment`, `evidence_commitment_manifest`, `v11_issuance_phase` to `decision_receipts`. **Not applied** in Demo or Production for Build #845.

## Sovereign parity

`evaluateSovereignCurrentValidity` uses the same v1.1.0 canonical payload, payload hash, and `assertV11OperationalIntegrity` as the operational path. Missing sovereign mirror data still fails closed (no invented success).

## Demo activation requirements (remaining)

1. Founder authorization for `DECISION_RECEIPT_ISSUANCE_SCHEMA=1.1.0`.
2. Apply migration **151** (issuance finalization) if not already on target DB.
3. Apply migration **152** and dual-write from issuance (follow-on build).
4. Operational soak with adversarial suite green on staging.
5. Billing and trust-anchor rotation remain out of scope until separate gates.
