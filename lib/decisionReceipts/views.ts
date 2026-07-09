// FILE: lib/decisionReceipts/views.ts
// Public and partner-safe receipt views.

import type {
  DecisionReceiptCanonicalPayload,
  DecisionReceiptPartnerView,
  DecisionReceiptPublicView,
  DecisionReceiptRecord,
} from "@/lib/decisionReceipts/types";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { verifyReceiptSignature, loadReceiptVerificationKey } from "@/lib/decisionReceipts/signing";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";

export function resolveReceiptStatus(record: DecisionReceiptRecord): DecisionReceiptRecord["status"] {
  if (record.status === "revoked" || record.revoked_at) return "revoked";
  if (record.expires_at && new Date(record.expires_at) < new Date()) return "expired";
  return record.status === "expired" ? "expired" : "active";
}

export function isReceiptCurrentlyValid(record: DecisionReceiptRecord): boolean {
  const status = resolveReceiptStatus(record);
  if (status !== "active") return false;
  if (record.decision_context === "sandbox_only") return false;
  if (isSandboxPolicyId(record.policy_id)) return false;
  return true;
}

function toCanonical(record: DecisionReceiptRecord): DecisionReceiptCanonicalPayload {
  return buildCanonicalPayload({
    receipt_id: record.id,
    schema_version: record.schema_version,
    decision_id: record.verification_decision_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    partner_id: record.partner_id,
    subject_pseudonym_id: record.subject_pseudonym_id,
    wallet_binding_ref: record.wallet_binding_ref,
    consent_receipt_id: record.consent_receipt_id,
    decision_result: record.decision_result,
    reason_codes: record.reason_codes,
    evaluated_claim_refs: record.evaluated_claim_refs,
    issuer_refs: record.issuer_refs,
    decision_context: record.decision_context,
    evaluated_at: record.evaluated_at,
    expires_at: record.expires_at,
  });
}

export function verifyRecordSignature(record: DecisionReceiptRecord): boolean {
  const publicKey = loadReceiptVerificationKey();
  if (!publicKey) return false;
  const payload = toCanonical(record);
  return verifyReceiptSignature(payload, record.signature, publicKey);
}

export function toPublicView(record: DecisionReceiptRecord): DecisionReceiptPublicView {
  const status = resolveReceiptStatus(record);
  const signatureValid = verifyRecordSignature(record);
  return {
    receipt_id: record.id,
    schema_version: record.schema_version,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    partner_id: record.partner_id,
    subject_pseudonym_id: record.subject_pseudonym_id,
    decision_result: record.decision_result,
    reason_codes: record.reason_codes,
    evaluated_claim_refs: record.evaluated_claim_refs,
    issuer_refs: record.issuer_refs,
    decision_context: record.decision_context,
    production_usable: record.decision_context === "production" && !isSandboxPolicyId(record.policy_id),
    evaluated_at: record.evaluated_at,
    expires_at: record.expires_at,
    status,
    payload_hash: record.payload_hash,
    signature: record.signature,
    signing_key_id: record.signing_key_id,
    signature_valid: signatureValid,
    anchor_reference: record.anchor_reference,
    artifact_type: "eligibility_decision_receipt",
  };
}

export function toPartnerView(
  record: DecisionReceiptRecord,
  consentScopeAllowed: boolean,
): DecisionReceiptPartnerView {
  return {
    ...toPublicView(record),
    decision_id: record.verification_decision_id,
    consent_receipt_id: record.consent_receipt_id,
    wallet_binding_ref: consentScopeAllowed ? record.wallet_binding_ref : null,
    consent_scope_allowed: consentScopeAllowed,
  };
}

/** Ensure public output contains no raw PII field names */
export function assertNoPiiInPublicView(view: DecisionReceiptPublicView): void {
  const json = JSON.stringify(view);
  const forbidden = ["subject_id", "sui_address", "claim_value", "email", "passport", "date_of_birth"];
  for (const term of forbidden) {
    if (json.includes(`"${term}"`)) {
      throw new Error(`Public receipt view must not contain ${term}`);
    }
  }
}
