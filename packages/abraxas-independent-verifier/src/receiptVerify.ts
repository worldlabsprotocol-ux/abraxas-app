import { buildCanonicalPayloadFromRecord, hashCanonicalPayload } from "./canonical";
import { verifyEd25519Detached } from "./crypto";
import type { DecisionReceiptRecord } from "./types";

export function verifyReceiptPayloadIntegrity(record: DecisionReceiptRecord): boolean {
  const payload = buildCanonicalPayloadFromRecord(record);
  return hashCanonicalPayload(payload) === record.payload_hash;
}

export function verifyReceiptSignatureWithPublicJwk(
  record: DecisionReceiptRecord,
  publicJwk: JsonWebKey,
): boolean {
  const payload = buildCanonicalPayloadFromRecord(record);
  const message = Buffer.from(record.payload_hash, "hex");
  return verifyEd25519Detached({
    message,
    signatureBase64Url: record.signature,
    publicJwk,
  });
}
