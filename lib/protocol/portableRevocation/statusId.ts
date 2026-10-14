// FILE: lib/protocol/portableRevocation/statusId.ts

import { createHash } from "node:crypto";

/** Privacy-preserving receipt status handle — unlinkable without receipt_id + issuer_id. */
export function portableRevocationStatusId(receiptId: string, issuerId: string): string {
  return createHash("sha256").update(`${issuerId.trim()}\n${receiptId.trim()}`, "utf8").digest("hex");
}
