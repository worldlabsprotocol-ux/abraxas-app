// FILE: lib/decisionReceipts/trustEvaluation.server.ts
// Operational trust evaluation — full v1.1.0 cryptographic verification on the server.
import "server-only";

export {
  evaluatePublicReceiptTrust,
  type TrustEvaluationContext,
  type TrustEvaluationResult,
  type TrustValidityState,
} from "@/lib/decisionReceipts/trustEvaluation";

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  evaluateDecisionReceiptTrust as evaluateDecisionReceiptTrustBase,
  evaluateDecisionReceiptTrustSync as evaluateDecisionReceiptTrustSyncBase,
  type TrustEvaluationContext,
  type TrustEvaluationResult,
} from "@/lib/decisionReceipts/trustEvaluation";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver.server";
import { verifyRecordSignatureOperational } from "@/lib/decisionReceipts/receiptSignatureVerify.server";
import { assertV11OperationalIntegrity } from "@/lib/decisionReceipts/v1_1_0/operationalIntegrity.server";

const operationalValidityOptions = {
  verifySignature: (record: DecisionReceiptRecord) => verifyRecordSignatureOperational(record),
  postSignatureInvalidation: (record: DecisionReceiptRecord) => {
    const integrity = assertV11OperationalIntegrity(record);
    return integrity.ok ? [] : integrity.reasons;
  },
};

export async function evaluateDecisionReceiptTrust(
  record: DecisionReceiptRecord,
  context?: TrustEvaluationContext,
): Promise<TrustEvaluationResult> {
  return evaluateDecisionReceiptTrustBase(record, context, {
    resolveValidity: resolveReceiptValidity,
    validityOptions: operationalValidityOptions,
  });
}

export function evaluateDecisionReceiptTrustSync(
  record: DecisionReceiptRecord,
  context?: TrustEvaluationContext,
): TrustEvaluationResult {
  return evaluateDecisionReceiptTrustSyncBase(record, context, verifyRecordSignatureOperational);
}
