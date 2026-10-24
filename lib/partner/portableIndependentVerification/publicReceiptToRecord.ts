// FILE: lib/partner/portableIndependentVerification/publicReceiptToRecord.ts

import type { DecisionReceiptPublicView, DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

export function publicReceiptToVerifierRecord(
  view: DecisionReceiptPublicView,
): DecisionReceiptRecord | { ok: false; reason: "verification_decision_id_missing" } {
  const verificationDecisionId = view.verification_decision_id?.trim();
  if (!verificationDecisionId) {
    return { ok: false, reason: "verification_decision_id_missing" };
  }
  return {
    id: view.receipt_id,
    verification_decision_id: verificationDecisionId,
    consent_receipt_id: view.consent_receipt_id ?? null,
    partner_id: view.partner_id,
    policy_id: view.policy_id,
    policy_version: view.policy_version,
    subject_pseudonym_id: view.subject_pseudonym_id,
    wallet_binding_ref: view.wallet_binding_ref ?? null,
    decision_result: view.decision_result,
    reason_codes: view.reason_codes,
    evaluated_claim_refs: view.evaluated_claim_refs,
    issuer_refs: view.issuer_refs,
    decision_context: view.decision_context,
    evaluated_at: view.evaluated_at,
    expires_at: view.expires_at,
    revoked_at: view.revoked_at ?? null,
    status: view.status,
    schema_version: view.schema_version,
    payload_hash: view.payload_hash,
    signature: view.signature,
    signing_key_id: view.signing_key_id,
    anchor_reference: view.anchor_reference,
    idempotency_key: null,
    created_at: view.evaluated_at,
  };
}
