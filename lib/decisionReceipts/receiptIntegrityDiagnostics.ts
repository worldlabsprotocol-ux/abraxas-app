// FILE: lib/decisionReceipts/receiptIntegrityDiagnostics.ts
// Read-only receipt integrity checks — no mutations, no secret material.

import { buildCanonicalPayload, hashCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import type {
  DecisionReceiptCanonicalPayload,
  DecisionReceiptRecord,
} from "@/lib/decisionReceipts/types";
import { verifyRecordSignature } from "@/lib/decisionReceipts/views";

export interface ReceiptIntegrityReport {
  payload_hash_matches_recomputed: boolean;
  signature_valid: boolean;
}

function canonicalFromRecord(record: DecisionReceiptRecord): DecisionReceiptCanonicalPayload {
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

export function evaluateReceiptIntegrity(record: DecisionReceiptRecord): ReceiptIntegrityReport {
  const canonical = canonicalFromRecord(record);
  const recomputedHash = hashCanonicalPayload(canonical);
  return {
    payload_hash_matches_recomputed: record.payload_hash === recomputedHash,
    signature_valid: verifyRecordSignature(record),
  };
}

const ALLOWED_INTEGRITY_KEYS = new Set([
  "payload_hash_matches_recomputed",
  "signature_valid",
]);

export function integrityResponseHasNoSecrets(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== ALLOWED_INTEGRITY_KEYS.size) return false;
  for (const key of keys) {
    if (!ALLOWED_INTEGRITY_KEYS.has(key)) return false;
    if (typeof record[key] !== "boolean") return false;
  }
  return true;
}
