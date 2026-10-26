// FILE: lib/decisionReceipts/v1_1_0/independentProjection.ts
// Operational receipt lifecycle vs independently verifiable receipt projection.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { DecisionReceiptRecord as VerifierDecisionReceiptRecord } from "@abraxas/independent-verifier";
import {
  DECISION_RECEIPT_SCHEMA_V1_1,
  type EvidenceCommitmentEntryV1,
} from "@/lib/decisionReceipts/schema/v1_1_0";
import { decodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";

export type IndependentProjectionResult =
  | { ok: true; receipt: VerifierDecisionReceiptRecord }
  | { ok: false; reason: string };

/** Map operational status to verifier-accepted lifecycle (never pending_finalization). */
function toVerifierLifecycleStatus(
  record: DecisionReceiptRecord,
): VerifierDecisionReceiptRecord["status"] {
  const resolved = resolveReceiptStatus(record);
  if (resolved === "pending_finalization") return "active";
  return resolved;
}

/**
 * Project an operational receipt for standalone verification.
 * Pending or unfinalized v1.1.0 receipts are never exported as verifiable artifacts.
 */
export function projectOperationalReceiptForIndependentVerification(
  record: DecisionReceiptRecord,
): IndependentProjectionResult {
  if (record.status === "pending_finalization") {
    return { ok: false, reason: "operational_pending_not_independently_verifiable" };
  }

  if (record.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
    return {
      ok: true,
      receipt: {
        ...record,
        status: toVerifierLifecycleStatus(record),
        application_binding_ref: undefined,
        evidence_commitment: undefined,
      },
    };
  }

  const sidecar = decodeReceiptV11Sidecar(record.anchor_reference);
  if (!sidecar.ok) {
    return { ok: false, reason: `sidecar_${sidecar.reason}` };
  }
  if (sidecar.sidecar.issuance_phase !== "final") {
    return { ok: false, reason: "issuance_not_finalized" };
  }
  if (sidecar.sidecar.evidence_commitment === null) {
    return { ok: false, reason: "signed_v11_fields_missing" };
  }

  return {
    ok: true,
    receipt: {
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
      status: toVerifierLifecycleStatus(record),
      schema_version: record.schema_version,
      payload_hash: record.payload_hash,
      signature: record.signature,
      signing_key_id: record.signing_key_id,
      application_binding_ref: sidecar.sidecar.application_binding_ref,
      evidence_commitment: sidecar.sidecar.evidence_commitment,
    },
  };
}

export function exportPortableEvidenceCommitmentManifest(
  record: DecisionReceiptRecord,
): { ok: true; manifest: EvidenceCommitmentEntryV1[] } | { ok: false; reason: string } {
  if (record.schema_version !== DECISION_RECEIPT_SCHEMA_V1_1) {
    return { ok: false, reason: "not_v11_receipt" };
  }
  const sidecar = decodeReceiptV11Sidecar(record.anchor_reference);
  if (!sidecar.ok) return { ok: false, reason: `sidecar_${sidecar.reason}` };
  if (sidecar.sidecar.issuance_phase !== "final") {
    return { ok: false, reason: "issuance_not_finalized" };
  }
  const manifest = sidecar.sidecar.evidence_commitment_manifest ?? [];
  const entryCount = sidecar.sidecar.evidence_commitment?.entry_count ?? 0;
  if (entryCount !== manifest.length) {
    return { ok: false, reason: "manifest_entry_count_mismatch" };
  }
  return { ok: true, manifest };
}
