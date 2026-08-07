// FILE: lib/x402/referenceGateway/idempotency.ts
// Durable idempotency key derivation for fulfillment ledger.

import { createHash } from "crypto";

export function buildFulfillmentIdempotencyKey(input: {
  partnerId: string;
  resourceId: string;
  receiptId: string;
  paymentPayloadHash: string;
}): string {
  const material = [
    input.partnerId,
    input.resourceId,
    input.receiptId,
    input.paymentPayloadHash,
  ].join("|");
  return createHash("sha256").update(material, "utf8").digest("hex");
}
