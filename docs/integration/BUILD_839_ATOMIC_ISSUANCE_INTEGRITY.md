# Build #839 — Atomic issuance integrity

## Defect

Reuse issuance signed receipts as `active` before evidence dependencies and sovereign mirror completed. Failed finalization attempted revocation without verifying the write, which could leave an **active** receipt with incomplete evidence.

## Invariant

Receipts requiring evidence finalization are inserted as `pending_finalization` with `issuance_finalized_at` null. They are not authorizable until `finalizeReuseEvidenceForIssuance` commits dependencies, mirror (when required), and `activateDecisionReceiptIssuance` succeeds.

Incomplete receipts fail closed across operational validity, sovereign validity, signed status publication, reuse as source, and partner metering.

## Schema (founder-gated)

Migration `151_decision_receipt_issuance_finalization.sql`: status `pending_finalization`, column `issuance_finalized_at`, backfill for legacy rows.

## Deployment sequence (Production)

1. **Before migration 151:** deploy application with `DECISION_RECEIPT_ISSUANCE_FINALIZATION_SCHEMA=legacy` (or rely on auto probe). Immediate issuance continues without writing `issuance_finalized_at`. Staged reuse issuance **fails closed** (`staged_issuance_unavailable`). No zombie active reuse receipts.
2. **Founder authorizes migration 151** in Supabase SQL editor (not applied by this PR).
3. **After migration:** set `DECISION_RECEIPT_ISSUANCE_FINALIZATION_SCHEMA=v151` (optional if auto probe succeeds). Staged reuse path enabled: pending → finalize → activate.

Rollback: revert application to prior release. Legacy schema remains compatible. Pending rows (if any post migration) stay non authorizable.

## Limitations

- Decision row may remain after failed finalize; receipt stays pending or revoked and non-authorizable.
- Non-reuse issuance remains immediate-finalization (unchanged).
- Receipt canonical payload schema remains 1.0.0.
