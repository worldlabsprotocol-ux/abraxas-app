// FILE: lib/decisionReceipts/v1_1_0/canonicalIssuance.ts

import {
  buildCanonicalPayloadV1_1,
  hashCanonicalPayloadV1_1,
  type DecisionReceiptRecordV1_1,
} from "@/lib/decisionReceipts/schema/v1_1_0";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { decodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";

export function attachV11FieldsFromSidecar(record: DecisionReceiptRecord): DecisionReceiptRecordV1_1 {
  if (record.schema_version !== "1.1.0") return record;
  const sidecar = decodeReceiptV11Sidecar(record.anchor_reference);
  return {
    ...record,
    application_binding_ref: sidecar?.application_binding_ref ?? null,
    evidence_commitment: sidecar?.evidence_commitment ?? null,
  };
}

export function buildSignedCanonicalV11(record: DecisionReceiptRecordV1_1) {
  const payload = buildCanonicalPayloadV1_1(record);
  const payloadHash = hashCanonicalPayloadV1_1(payload);
  return { payload, payloadHash };
}
