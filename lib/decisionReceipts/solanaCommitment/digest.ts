import { createHash } from "crypto";

export const RECEIPT_COMMITMENT_DOMAIN = "abraxas:receipt_commitment:v1" as const;

/** Domain-separated digest over the canonical receipt payload hash (already partner-safe). */
export function buildReceiptCommitmentDigest(payloadHash: string): string {
  if (!/^[a-f0-9]{64}$/.test(payloadHash)) {
    throw new Error("invalid_payload_hash");
  }
  return createHash("sha256")
    .update(`${RECEIPT_COMMITMENT_DOMAIN}:${payloadHash}`, "utf8")
    .digest("hex");
}
