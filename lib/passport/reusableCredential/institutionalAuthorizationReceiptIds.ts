// FILE: lib/passport/reusableCredential/institutionalAuthorizationReceiptIds.ts

import { createHash } from "crypto";

export function deterministicAuthorizationReceiptIds(idempotencyKey: string): {
  receiptId: string;
  decisionId: string;
} {
  const digest = createHash("sha256").update(idempotencyKey, "utf8").digest("hex");
  const receiptId = `dr_${digest.slice(0, 22)}`;
  const decisionId = [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `8${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
  return { receiptId, decisionId };
}
