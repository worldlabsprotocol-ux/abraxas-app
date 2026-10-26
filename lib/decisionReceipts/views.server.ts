// FILE: lib/decisionReceipts/views.server.ts
import "server-only";

import type { DecisionReceiptRecord, DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";
import { verifyRecordSignatureOperational } from "@/lib/decisionReceipts/receiptSignatureVerify.server";
import {
  assertNoPiiInPublicView,
  isReceiptCurrentlyValid,
  resolveReceiptStatus,
  toPublicView as toPublicViewClient,
} from "@/lib/decisionReceipts/views";

export { assertNoPiiInPublicView, isReceiptCurrentlyValid, resolveReceiptStatus };

export function verifyRecordSignature(record: DecisionReceiptRecord): boolean {
  return verifyRecordSignatureOperational(record);
}

export function toPublicView(record: DecisionReceiptRecord): DecisionReceiptPublicView {
  return toPublicViewClient(record, verifyRecordSignatureOperational);
}
