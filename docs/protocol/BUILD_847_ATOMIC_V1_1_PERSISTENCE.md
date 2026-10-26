# Build #847 — Atomic receipt v1.1.0 persistence

## Starting condition

PR #846 merged (`d4496e08`). Persistence parity rules live in `dedicatedPersistence.ts`.

## Migration compatibility (no migrations applied)

| Epoch | Detection (row **keys**, not inferred NULL) | Read behavior |
|-------|-----------------------------------------------|---------------|
| Pre-151 legacy | No `issuance_finalized_at` key | Immediate-finalization semantics; v1.0.0 unchanged |
| Post-151, pre-152 | `issuance_finalized_at` key; no v1.1 dedicated keys | Staged issuance; sidecar holds v1.1 signed fields |
| Sidecar-only v1.1.0 | Schema `1.1.0`, no migration 152 keys | Sidecar authoritative (`#846` rules) |
| Post-152 unbackfilled | All 152 keys present, values null / phase null | Sidecar authoritative until backfill |
| Partially backfilled | Any dedicated field populated without complete final set | Fail closed on parity when enforced |
| Fully finalized dedicated | `v11_issuance_phase=final` + commitment + manifest array | Dedicated + sidecar must agree |

Classification: `persistenceState.ts` (`classifyStorageSchemaEpoch`, `classifyV11DedicatedPersistenceEpoch`).

## Atomic finalization contract

**Application (`assertAtomicFinalizationWritePayload`):** a single finalization commit must include payload hash, signature, anchor sidecar, evidence commitment, manifest array, `issuance_finalized_at`, and `v11_issuance_phase=final`. Application binding may be null when scope does not require it.

**Database (`153_decision_receipt_v11_finalize_atomic.sql`):** one `UPDATE` under row lock from `pending_finalization`, matching provisional `payload_hash`. Writes every dedicated column together with status `active`. Returns `{ ok, code, row }`.

**Activation gates (all required):**

1. Migrations **151** and **152** applied on target DB.
2. `DECISION_RECEIPT_V11_DEDICATED_PERSISTENCE=v152`.
3. `DECISION_RECEIPT_V11_ATOMIC_FINALIZE=authorized` (founder).
4. `DECISION_RECEIPT_ISSUANCE_SCHEMA=1.1.0` (separate issuance gate, still off).

Without gates: `finalizePendingV11ReceiptCryptographic` keeps the existing sidecar-only `UPDATE` (Build #839/#845 behavior).

## Backfill (plan only)

`planV11DedicatedBackfillFromRows` — dry-run idempotent planner. Validates sidecar final phase and commitment digests; counts `eligible`, `already_final`, `conflict`, `reject`. **No execute path** in this build; founder approval required before any backfill SQL.

Legacy readers remain until backfill parity is proven in a follow-on soak.

## Independent verification

Trust root remains signed canonical payload + registry keys, not PostgreSQL column presence. Operational, sovereign, and `@abraxas/independent-verifier` paths unchanged in trust model; dedicated fields affect authoritative field resolution only after migration parity (`#846`).

## Remaining rollout gates

| Gate | Owner |
|------|--------|
| Apply migration 151 | Operator / founder |
| Apply migration 152 | Founder |
| Apply migration 153 (atomic RPC) | Founder |
| Enable atomic finalize env | Founder |
| Enable v1.1.0 issuance schema | Founder |
| Execute backfill | Founder (separate approval) |
| Demo soak | Operator |
| Production | Not in scope |

## Restrictions (Build #847)

No Demo/Production migration apply. No v1.1.0 activation. No production redeploy requirement. No key rotation. No billing. No new infrastructure.
