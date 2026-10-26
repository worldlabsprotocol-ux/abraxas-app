// FILE: lib/decisionReceipts/independentVerifierBridge.ts
// Map app receipt records to @abraxas/independent-verifier v0.1.1 shapes (no pending status).

import type { DecisionReceiptRecord as VerifierRecord } from "@abraxas/independent-verifier";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  isReceiptPendingEvidenceFinalization,
  issuanceFinalizationInvalidationReasons,
} from "@/lib/decisionReceipts/issuanceFinalization";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";

export function toIndependentVerifierRecord(record: DecisionReceiptRecord): VerifierRecord {
  if (
    isReceiptPendingEvidenceFinalization(record)
    || issuanceFinalizationInvalidationReasons(record).length > 0
  ) {
    throw new Error("issuance_not_finalized");
  }
  const status = resolveReceiptStatus(record);
  const verifierStatus =
    status === "pending_finalization" ? "revoked" : status;
  return {
    ...record,
    status: verifierStatus,
  };
}
