// FILE: lib/eligibilityPresentation/sourceReceipt.ts
// Testable source-receipt loader. Fail closed without consent.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { getReceiptById } from "@/lib/decisionReceipts/service";

const receipts = new Map<string, DecisionReceiptRecord>();

export function putSourceReceiptForTests(record: DecisionReceiptRecord): void {
  receipts.set(record.id, record);
}

export function resetSourceReceiptsForTests(): void {
  receipts.clear();
}

export async function loadSourceReceipt(receiptId: string): Promise<DecisionReceiptRecord | null> {
  const cached = receipts.get(receiptId);
  if (cached) return cached;
  if (process.env.VITEST) return null;
  try {
    return await getReceiptById(receiptId);
  } catch {
    return null;
  }
}

export function receiptHasFreshConsent(record: DecisionReceiptRecord): boolean {
  return Boolean(record.consent_receipt_id && record.consent_receipt_id.length > 4);
}

export function receiptEnvironment(record: DecisionReceiptRecord): "sandbox" | "production" {
  return record.decision_context === "production" ? "production" : "sandbox";
}
