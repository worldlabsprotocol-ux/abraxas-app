// FILE: lib/decisionReceipts/canonical.ts
// Deterministic JSON canonicalization for decision receipt hashing/signing.

import { createHash } from "crypto";
import type { DecisionReceiptCanonicalPayload } from "@/lib/decisionReceipts/types";

/** Postgres TIMESTAMPTZ may return +00:00; signing uses Z — normalize before verify. */
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

/** Canonical JSON: sorted keys, no whitespace, stable arrays */
export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function hashCanonicalPayload(payload: DecisionReceiptCanonicalPayload): string {
  const canonical = canonicalizeJson(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function buildCanonicalPayload(
  input: Omit<DecisionReceiptCanonicalPayload, "schema_version"> & { schema_version?: string },
): DecisionReceiptCanonicalPayload {
  return {
    schema_version: input.schema_version ?? "1.0.0",
    receipt_id: input.receipt_id,
    decision_id: input.decision_id,
    policy_id: input.policy_id,
    policy_version: input.policy_version,
    partner_id: input.partner_id,
    subject_pseudonym_id: input.subject_pseudonym_id,
    wallet_binding_ref: input.wallet_binding_ref,
    consent_receipt_id: input.consent_receipt_id,
    decision_result: input.decision_result,
    reason_codes: [...input.reason_codes].sort(),
    evaluated_claim_refs: [...input.evaluated_claim_refs]
      .map(ref => ({
        claim_id: ref.claim_id,
        claim_type: ref.claim_type,
        issuer_id: ref.issuer_id,
        status: ref.status,
        issued_at: ref.issued_at,
        expires_at: ref.expires_at,
      }))
      .sort((a, b) => a.claim_id.localeCompare(b.claim_id)),
    issuer_refs: [...input.issuer_refs].sort(),
    decision_context: input.decision_context,
    evaluated_at: normalizeDecisionReceiptTimestamp(input.evaluated_at),
    expires_at: input.expires_at
      ? normalizeDecisionReceiptTimestamp(input.expires_at)
      : null,
  };
}
