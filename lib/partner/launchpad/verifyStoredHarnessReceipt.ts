import { buildCanonicalPayload, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import { resolveVerificationKey } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve";
import type { DecisionReceiptPublicView } from "@/lib/decisionReceipts/types";

/** Reconstruct the signed payload and resolve an authorized issuer key afresh. */
export function verifyStoredHarnessReceipt(payload: unknown, storedSignature: string): {
  receipt: DecisionReceiptPublicView | null;
  signatureValid: boolean;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { receipt: null, signatureValid: false };
  }
  const receipt = payload as DecisionReceiptPublicView;
  if (!receipt.receipt_id || !receipt.verification_decision_id || !receipt.signing_key_id
    || !receipt.schema_version || !receipt.payload_hash || !receipt.signature
    || receipt.signature !== storedSignature || !Array.isArray(receipt.reason_codes)
    || !Array.isArray(receipt.evaluated_claim_refs) || !Array.isArray(receipt.issuer_refs)) {
    return { receipt, signatureValid: false };
  }
  try {
    const canonical = buildCanonicalPayload({
      receipt_id: receipt.receipt_id,
      decision_id: receipt.verification_decision_id,
      schema_version: receipt.schema_version,
      policy_id: receipt.policy_id,
      policy_version: receipt.policy_version,
      partner_id: receipt.partner_id,
      subject_pseudonym_id: receipt.subject_pseudonym_id,
      wallet_binding_ref: receipt.wallet_binding_ref ?? null,
      consent_receipt_id: receipt.consent_receipt_id ?? null,
      decision_result: receipt.decision_result,
      reason_codes: receipt.reason_codes,
      evaluated_claim_refs: receipt.evaluated_claim_refs,
      issuer_refs: receipt.issuer_refs,
      decision_context: receipt.decision_context,
      evaluated_at: receipt.evaluated_at,
      expires_at: receipt.expires_at,
    });
    const key = resolveVerificationKey({ keyId: receipt.signing_key_id, schemaVersion: receipt.schema_version });
    const signatureValid = key.ok
      && receipt.payload_hash === hashCanonicalPayload(canonical)
      && verifyReceiptSignature(canonical, storedSignature, key.key.public_jwk);
    return { receipt, signatureValid };
  } catch {
    return { receipt, signatureValid: false };
  }
}
