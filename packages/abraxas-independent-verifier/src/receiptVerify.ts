import { buildCanonicalPayloadFromRecord, hashCanonicalPayload } from "./canonical";
import { verifyEd25519Detached } from "./crypto";
import type { DecisionReceiptRecord } from "./types";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "./v1_1_0/constants";
import {
  buildCanonicalPayloadV1_1,
  hashCanonicalPayloadV1_1,
  rejectSchemaDowngrade,
  type DecisionReceiptRecordV1_1,
} from "./v1_1_0/canonical";

export function verifyReceiptPayloadIntegrity(record: DecisionReceiptRecord): boolean {
  if (!rejectSchemaDowngrade(record as Record<string, unknown>)) return false;
  if (record.schema_version === DECISION_RECEIPT_SCHEMA_V1_1) {
    const payload = buildCanonicalPayloadV1_1(record as DecisionReceiptRecordV1_1);
    return hashCanonicalPayloadV1_1(payload) === record.payload_hash;
  }
  const payload = buildCanonicalPayloadFromRecord(record);
  return hashCanonicalPayload(payload) === record.payload_hash;
}

export function verifyReceiptSignatureWithPublicJwk(
  record: DecisionReceiptRecord,
  publicJwk: JsonWebKey,
): boolean {
  if (!verifyReceiptPayloadIntegrity(record)) return false;
  const message = Buffer.from(record.payload_hash, "hex");
  return verifyEd25519Detached({
    message,
    signatureBase64Url: record.signature,
    publicJwk,
  });
}
