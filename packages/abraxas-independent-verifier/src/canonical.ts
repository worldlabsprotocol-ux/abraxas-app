import { createHash } from "node:crypto";
import type { DecisionReceiptRecord, IssuerAuthorityStatementPayload } from "./types";

export function normalizeDecisionReceiptTimestamp(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  return new Date(ms).toISOString();
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortValue(obj[key]);
  }
  return sorted;
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function hashIssuerAuthorityPayload(payload: IssuerAuthorityStatementPayload): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export type DecisionReceiptCanonicalPayload = {
  schema_version: string;
  receipt_id: string;
  decision_id: string;
  policy_id: string;
  policy_version: number;
  partner_id: string;
  subject_pseudonym_id: string;
  wallet_binding_ref: string | null;
  consent_receipt_id: string | null;
  decision_result: DecisionReceiptRecord["decision_result"];
  reason_codes: string[];
  evaluated_claim_refs: EvaluatedClaimRefCanonical[];
  issuer_refs: string[];
  decision_context: DecisionReceiptRecord["decision_context"];
  evaluated_at: string;
  expires_at: string | null;
};

type EvaluatedClaimRefCanonical = {
  claim_id: string;
  claim_type: string;
  issuer_id?: string;
  status?: string;
  issued_at?: string;
  expires_at?: string | null;
};

export function buildCanonicalPayloadFromRecord(record: DecisionReceiptRecord): DecisionReceiptCanonicalPayload {
  return {
    schema_version: record.schema_version,
    receipt_id: record.id,
    decision_id: record.verification_decision_id,
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    partner_id: record.partner_id,
    subject_pseudonym_id: record.subject_pseudonym_id,
    wallet_binding_ref: record.wallet_binding_ref,
    consent_receipt_id: record.consent_receipt_id,
    decision_result: record.decision_result,
    reason_codes: [...record.reason_codes].sort(),
    evaluated_claim_refs: [...record.evaluated_claim_refs]
      .map((ref) => ({
        claim_id: ref.claim_id,
        claim_type: ref.claim_type,
        issuer_id: ref.issuer_id,
        status: ref.status,
        issued_at: ref.issued_at,
        expires_at: ref.expires_at,
      }))
      .sort((a, b) => a.claim_id.localeCompare(b.claim_id)),
    issuer_refs: [...record.issuer_refs].sort(),
    decision_context: record.decision_context,
    evaluated_at: normalizeDecisionReceiptTimestamp(record.evaluated_at),
    expires_at: record.expires_at ? normalizeDecisionReceiptTimestamp(record.expires_at) : null,
  };
}

export function hashCanonicalPayload(payload: DecisionReceiptCanonicalPayload): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
