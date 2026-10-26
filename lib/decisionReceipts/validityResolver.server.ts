// FILE: lib/decisionReceipts/validityResolver.server.ts
import "server-only";

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { resolveReceiptValidity as resolveReceiptValidityBase } from "@/lib/decisionReceipts/validityResolver";
import type { ReceiptValidityResult } from "@/lib/decisionReceipts/validityResolver";
import { verifyRecordSignatureOperational } from "@/lib/decisionReceipts/receiptSignatureVerify.server";
import { assertV11OperationalIntegrity } from "@/lib/decisionReceipts/v1_1_0/operationalIntegrity.server";

export type { ReceiptValidityResult, ReceiptValidityState } from "@/lib/decisionReceipts/validityResolver";
export { isReceiptCurrentlyValidSync } from "@/lib/decisionReceipts/validityResolver";

export async function resolveReceiptValidity(
  record: DecisionReceiptRecord,
  trustContext?: { partnerId?: string; policyId?: string },
): Promise<ReceiptValidityResult> {
  return resolveReceiptValidityBase(record, trustContext, {
    verifySignature: (row) => verifyRecordSignatureOperational(row),
    postSignatureInvalidation: (row) => {
      const integrity = assertV11OperationalIntegrity(row);
      return integrity.ok ? [] : integrity.reasons;
    },
  });
}
