// FILE: lib/decisionReceipts/verificationKeyLifecycle/resolve.server.ts
import "server-only";

import type { DecisionReceiptCanonicalPayload, DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0.constants";
import {
  attachV11FieldsFromSidecar,
  buildSignedCanonicalV11,
} from "@/lib/decisionReceipts/v1_1_0/canonicalIssuance.server";
import { verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import {
  resolveVerificationKey,
  verifyRecordSignatureWithRegistry as verifyRecordSignatureWithRegistryClientSafe,
} from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve";

/** Server-side signature verification including v1.1.0 canonical payloads. */
export function verifyRecordSignatureWithRegistry(
  record: DecisionReceiptRecord,
  now?: Date,
  env?: Record<string, string | undefined>,
): boolean {
  if (record.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
    return verifyRecordSignatureWithRegistryClientSafe(record, now, env);
  }
  const resolved = resolveVerificationKey({
    keyId: record.signing_key_id,
    schemaVersion: record.schema_version,
    now,
    env,
  });
  if (!resolved.ok) return false;
  const v11Record = attachV11FieldsFromSidecar(record);
  const { payload } = buildSignedCanonicalV11(v11Record);
  return verifyReceiptSignature(
    payload as DecisionReceiptCanonicalPayload,
    record.signature,
    resolved.key.public_jwk,
  );
}
