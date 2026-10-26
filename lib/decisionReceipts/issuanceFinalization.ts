// FILE: lib/decisionReceipts/issuanceFinalization.ts
// Authoritative issuance finalization contract (storage-agnostic).

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

export const ISSUANCE_INCOMPLETE_REASON = "issuance_incomplete" as const;

/** Receipt exists but must not authorize until evidence and authoritative state are committed. */
export function isReceiptPendingEvidenceFinalization(record: DecisionReceiptRecord): boolean {
  return record.status === "pending_finalization";
}

/**
 * A receipt may authorize current-validity enforcement only when finalized.
 * Legacy rows: active with backfilled issuance_finalized_at (migration 151).
 */
export function isReceiptIssuanceFinalized(record: DecisionReceiptRecord): boolean {
  if (record.status === "pending_finalization") return false;
  if (record.status === "revoked" || record.status === "expired") return false;
  if (record.status !== "active") return false;
  if (record.issuance_finalized_at) return true;
  // Pre-migration column absent: active receipts were issued under immediate-finalization semantics.
  return record.issuance_finalized_at === undefined;
}

export function isReceiptIssuanceAuthorizable(record: DecisionReceiptRecord): boolean {
  return isReceiptIssuanceFinalized(record);
}

export function issuanceFinalizationInvalidationReasons(
  record: DecisionReceiptRecord,
): string[] {
  if (isReceiptIssuanceAuthorizable(record)) return [];
  if (isReceiptPendingEvidenceFinalization(record)) {
    return [ISSUANCE_INCOMPLETE_REASON];
  }
  return [ISSUANCE_INCOMPLETE_REASON];
}
