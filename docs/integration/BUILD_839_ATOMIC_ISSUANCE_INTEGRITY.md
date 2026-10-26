# Build #839 — Atomic issuance integrity

## Defect

Reuse issuance signed receipts as `active` before evidence dependencies and sovereign mirror completed. Failed finalization attempted revocation without verifying the write, which could leave an **active** receipt with incomplete evidence.

## Invariant

Receipts requiring evidence finalization are inserted as `pending_finalization` with `issuance_finalized_at` null. They are not authorizable until `finalizeReuseEvidenceForIssuance` commits dependencies, mirror (when required), and `activateDecisionReceiptIssuance` succeeds.

Incomplete receipts fail closed across operational validity, sovereign validity, signed status publication, reuse as source, and partner metering.

## Schema (founder-gated)

Migration `151_decision_receipt_issuance_finalization.sql`: status `pending_finalization`, column `issuance_finalized_at`, backfill for legacy rows.

## Limitations

- Decision row may remain after failed finalize; receipt stays pending or revoked and non-authorizable.
- Non-reuse issuance remains immediate-finalization (unchanged).
- Receipt canonical payload schema remains 1.0.0.
