// FILE: lib/persistence/boundary/verticalSlice/receiptProvenance.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { resolveReceiptStatus, verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { querySovereignStagingPg } from "../sovereignStagingPg";
import type { ReceiptProvenanceSnapshot } from "../types";

type ReceiptRow = {
  id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  payload_hash: string;
  signature: string;
  signing_key_id: string;
  status: string;
  expires_at: string | null;
  revoked_at: string | null;
  verification_decision_id: string;
  consent_receipt_id: string | null;
  subject_pseudonym_id: string;
  wallet_binding_ref: string | null;
  decision_result: string;
  reason_codes: string[];
  evaluated_claim_refs: unknown;
  issuer_refs: string[];
  decision_context: string;
  evaluated_at: string;
  schema_version: string;
  created_at: string;
};

export function receiptProvenanceFromRecord(record: DecisionReceiptRecord): ReceiptProvenanceSnapshot {
  const signatureValid = verifyRecordSignature(record);
  const resolved = resolveReceiptStatus(record);
  let lifecycle: ReceiptProvenanceSnapshot["resolvedLifecycleStatus"] = "active";
  if (resolved === "revoked") lifecycle = "revoked";
  else if (resolved === "expired") lifecycle = "expired";
  else if (!signatureValid) lifecycle = "invalidated";

  return {
    receiptId: record.id,
    partnerId: record.partner_id,
    policyId: record.policy_id,
    policyVersion: record.policy_version,
    payloadHash: record.payload_hash,
    signature: record.signature,
    signingKeyId: record.signing_key_id,
    storedStatus: record.status,
    expiresAt: record.expires_at,
    revokedAt: record.revoked_at,
    signatureValid,
    resolvedLifecycleStatus: lifecycle,
  };
}

function rowToRecord(row: ReceiptRow): DecisionReceiptRecord {
  return {
    id: row.id,
    verification_decision_id: row.verification_decision_id,
    consent_receipt_id: row.consent_receipt_id,
    partner_id: row.partner_id,
    policy_id: row.policy_id,
    policy_version: row.policy_version,
    subject_pseudonym_id: row.subject_pseudonym_id,
    wallet_binding_ref: row.wallet_binding_ref,
    decision_result: row.decision_result as DecisionReceiptRecord["decision_result"],
    reason_codes: row.reason_codes ?? [],
    evaluated_claim_refs: (row.evaluated_claim_refs ?? []) as DecisionReceiptRecord["evaluated_claim_refs"],
    issuer_refs: row.issuer_refs ?? [],
    decision_context: row.decision_context as DecisionReceiptRecord["decision_context"],
    evaluated_at: row.evaluated_at,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    status: row.status as DecisionReceiptRecord["status"],
    schema_version: row.schema_version,
    payload_hash: row.payload_hash,
    signature: row.signature,
    signing_key_id: row.signing_key_id,
    anchor_reference: null,
    idempotency_key: null,
    created_at: row.created_at,
  };
}

export async function loadReceiptProvenanceFromSovereignPg(
  receiptId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<ReceiptProvenanceSnapshot | null> {
  const result = await querySovereignStagingPg<ReceiptRow>(
    `select id, partner_id, policy_id, policy_version, payload_hash, signature, signing_key_id,
            status, expires_at, revoked_at, verification_decision_id, consent_receipt_id,
            subject_pseudonym_id, wallet_binding_ref, decision_result, reason_codes,
            evaluated_claim_refs, issuer_refs, decision_context, evaluated_at, schema_version, created_at
       from public.decision_receipts
      where id = $1
      limit 1`,
    [receiptId],
    env,
  );
  if ("error" in result) return null;
  const row = result.rows[0];
  if (!row) return null;
  return receiptProvenanceFromRecord(rowToRecord(row));
}
