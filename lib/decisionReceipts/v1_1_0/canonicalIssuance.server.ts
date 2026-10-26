// FILE: lib/decisionReceipts/v1_1_0/canonicalIssuance.server.ts
import "server-only";

import {
  buildCanonicalPayloadV1_1,
  hashCanonicalPayloadV1_1,
  type DecisionReceiptRecordV1_1,
} from "@/lib/decisionReceipts/schema/v1_1_0.server";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { decodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";

export function attachV11FieldsFromSidecar(record: DecisionReceiptRecord): DecisionReceiptRecordV1_1 {
  if (record.schema_version !== "1.1.0") {
    return record as DecisionReceiptRecordV1_1;
  }
  const sidecar = decodeReceiptV11Sidecar(record.anchor_reference);
  const base: DecisionReceiptRecordV1_1 = {
    id: record.id,
    verification_decision_id: record.verification_decision_id,
    consent_receipt_id: record.consent_receipt_id,
    partner_id: record.partner_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    subject_pseudonym_id: record.subject_pseudonym_id,
    wallet_binding_ref: record.wallet_binding_ref,
    decision_result: record.decision_result,
    reason_codes: record.reason_codes,
    evaluated_claim_refs: record.evaluated_claim_refs,
    issuer_refs: record.issuer_refs,
    decision_context: record.decision_context,
    evaluated_at: record.evaluated_at,
    expires_at: record.expires_at,
    revoked_at: record.revoked_at,
    status: record.status === "pending_finalization" ? "active" : record.status,
    schema_version: record.schema_version,
    payload_hash: record.payload_hash,
    signature: record.signature,
    signing_key_id: record.signing_key_id,
    application_binding_ref: null,
    evidence_commitment: null,
  };
  if (!sidecar.ok) return base;
  return {
    ...base,
    application_binding_ref: sidecar.sidecar.application_binding_ref,
    evidence_commitment: sidecar.sidecar.evidence_commitment,
  };
}

export function buildSignedCanonicalV11(record: DecisionReceiptRecordV1_1) {
  const payload = buildCanonicalPayloadV1_1(record);
  const payloadHash = hashCanonicalPayloadV1_1(payload);
  return { payload, payloadHash };
}
