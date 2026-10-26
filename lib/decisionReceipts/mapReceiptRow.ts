// FILE: lib/decisionReceipts/mapReceiptRow.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { v11PersistenceContextFromRow } from "@/lib/decisionReceipts/v1_1_0/dedicatedPersistence";
import { decodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0";

/** Preserve undefined when migration 151 column is absent from the row payload. */
export function mapReceiptRow(row: Record<string, unknown>): DecisionReceiptRecord {
  const hasFinalizationColumn = Object.prototype.hasOwnProperty.call(row, "issuance_finalized_at");
  const mapped: DecisionReceiptRecord = {
    id: row.id as string,
    verification_decision_id: row.verification_decision_id as string,
    consent_receipt_id: (row.consent_receipt_id as string | null) ?? null,
    partner_id: row.partner_id as string,
    policy_id: row.policy_id as string,
    policy_version: row.policy_version as number,
    subject_pseudonym_id: row.subject_pseudonym_id as string,
    wallet_binding_ref: (row.wallet_binding_ref as string | null) ?? null,
    decision_result: row.decision_result as DecisionReceiptRecord["decision_result"],
    reason_codes: (row.reason_codes as string[]) ?? [],
    evaluated_claim_refs: (row.evaluated_claim_refs as DecisionReceiptRecord["evaluated_claim_refs"]) ?? [],
    issuer_refs: (row.issuer_refs as string[]) ?? [],
    decision_context: row.decision_context as DecisionReceiptRecord["decision_context"],
    evaluated_at: row.evaluated_at as string,
    expires_at: (row.expires_at as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
    status: row.status as DecisionReceiptRecord["status"],
    schema_version: row.schema_version as string,
    payload_hash: row.payload_hash as string,
    signature: row.signature as string,
    signing_key_id: row.signing_key_id as string,
    anchor_reference: (row.anchor_reference as string | null) ?? null,
    idempotency_key: (row.idempotency_key as string | null) ?? null,
    issuance_finalized_at: hasFinalizationColumn
      ? ((row.issuance_finalized_at as string | null | undefined) ?? null)
      : undefined,
    created_at: row.created_at as string,
  };
  if (mapped.schema_version === DECISION_RECEIPT_SCHEMA_V1_1) {
    const sidecar = decodeReceiptV11Sidecar(mapped.anchor_reference);
    const sidecarPhase = sidecar.ok ? sidecar.sidecar.issuance_phase : null;
    mapped.v11_dedicated_persistence = v11PersistenceContextFromRow(row, sidecarPhase);

    const columns = mapped.v11_dedicated_persistence.columns;
    if (columns.application_binding_ref) {
      mapped.application_binding_ref = (row.application_binding_ref as string | null) ?? null;
    }
    if (columns.evidence_commitment) {
      mapped.evidence_commitment = (row.evidence_commitment as DecisionReceiptRecord["evidence_commitment"]) ?? null;
    }
    if (columns.evidence_commitment_manifest) {
      mapped.evidence_commitment_manifest =
        (row.evidence_commitment_manifest as DecisionReceiptRecord["evidence_commitment_manifest"]) ?? null;
    }
    if (sidecar.ok) {
      if (!columns.application_binding_ref) {
        mapped.application_binding_ref = sidecar.sidecar.application_binding_ref;
      }
      if (!columns.evidence_commitment) {
        mapped.evidence_commitment = sidecar.sidecar.evidence_commitment;
      }
      if (!columns.evidence_commitment_manifest) {
        mapped.evidence_commitment_manifest = sidecar.sidecar.evidence_commitment_manifest;
      }
    }
  }
  return mapped;
}
