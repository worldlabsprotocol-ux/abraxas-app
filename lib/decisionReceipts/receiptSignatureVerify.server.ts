// FILE: lib/decisionReceipts/receiptSignatureVerify.server.ts
import "server-only";

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { verifyRecordSignatureWithRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve.server";
import type { ReceiptSignatureVerifier } from "@/lib/decisionReceipts/receiptSignatureVerify";

export const verifyRecordSignatureOperational: ReceiptSignatureVerifier = (record, now, env) =>
  verifyRecordSignatureWithRegistry(record, now, env);
