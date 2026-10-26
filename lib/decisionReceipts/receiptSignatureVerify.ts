// FILE: lib/decisionReceipts/receiptSignatureVerify.ts
// Client-safe receipt signature verification (v1.1.0 returns false — use server path).

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { verifyRecordSignatureWithRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve";

export type ReceiptSignatureVerifier = (
  record: DecisionReceiptRecord,
  now?: Date,
  env?: Record<string, string | undefined>,
) => boolean;

export const verifyRecordSignatureClientSafe: ReceiptSignatureVerifier = (record, now, env) =>
  verifyRecordSignatureWithRegistry(record, now, env);
