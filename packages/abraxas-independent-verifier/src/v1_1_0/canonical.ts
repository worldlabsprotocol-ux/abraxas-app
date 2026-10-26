import { createHash } from "node:crypto";
import {
  buildCanonicalPayloadFromRecord as buildV10FromRecord,
  canonicalizeJson,
  type DecisionReceiptCanonicalPayload as V10Payload,
} from "../canonical";
import { DECISION_RECEIPT_SCHEMA_V1_0, DECISION_RECEIPT_SCHEMA_V1_1 } from "./constants";
import type { EvidenceCommitmentV1 } from "./evidenceCommitment";
import type { DecisionReceiptRecord } from "../types";

export type DecisionReceiptCanonicalPayloadV1_1 = V10Payload & {
  schema_version: typeof DECISION_RECEIPT_SCHEMA_V1_1;
  application_binding_ref: string | null;
  evidence_commitment: EvidenceCommitmentV1 | null;
};

const V1_1_ONLY_KEYS = ["application_binding_ref", "evidence_commitment"] as const;

export function assertNoV11FieldsOnV10Record(record: Record<string, unknown>): boolean {
  for (const key of V1_1_ONLY_KEYS) {
    if (key in record && record[key] !== undefined) return false;
  }
  return true;
}

export type DecisionReceiptRecordV1_1 = DecisionReceiptRecord & {
  application_binding_ref?: string | null;
  evidence_commitment?: EvidenceCommitmentV1 | null;
};

export function buildCanonicalPayloadV1_1(record: DecisionReceiptRecordV1_1): DecisionReceiptCanonicalPayloadV1_1 {
  const base = buildV10FromRecord({ ...record, schema_version: DECISION_RECEIPT_SCHEMA_V1_0 });
  return {
    ...base,
    schema_version: DECISION_RECEIPT_SCHEMA_V1_1,
    application_binding_ref: record.application_binding_ref ?? null,
    evidence_commitment: record.evidence_commitment ?? null,
  };
}

export function hashCanonicalPayloadV1_1(payload: DecisionReceiptCanonicalPayloadV1_1): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** Reject downgrade: v1.0.0 canonical must not include v1.1 fields on the wire record. */
export function rejectSchemaDowngrade(record: Record<string, unknown>): boolean {
  if (record.schema_version === DECISION_RECEIPT_SCHEMA_V1_0) {
    return assertNoV11FieldsOnV10Record(record);
  }
  return true;
}
