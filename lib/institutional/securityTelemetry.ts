// Bounded security signals — audit trail only, no PII or secrets.

import { appendAuditEvent } from "@/lib/verification/audit";

export type InstitutionalSecuritySignalKind =
  | "invalid_signature"
  | "replay_attempt"
  | "duplicate_nonce_rejected"
  | "durable_store_failure"
  | "cross_tenant_attempt"
  | "invalid_nonce"
  | "unauthorized_scope"
  | "scope_violation"
  | "repeated_denial"
  | "revocation_observed"
  | "stale_or_revoked_evidence"
  | "governance_evidence_mismatch"
  | "policy_mismatch"
  | "partner_mismatch"
  | "subject_mismatch";

const SAFE_METADATA_KEYS = new Set([
  "kind",
  "correlation_id",
  "receipt_id",
  "policy_id",
  "policy_version",
  "action_scope",
  "application_id",
  "reason_codes",
  "validity_state",
  "http_status",
]);

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (Array.isArray(value) && value.every(v => typeof v === "string")) {
      out[key] = value.slice(0, 20);
    }
  }
  return out;
}

export async function recordInstitutionalSecuritySignal(input: {
  kind: InstitutionalSecuritySignalKind;
  partnerId: string;
  correlationId?: string | null;
  receiptId?: string | null;
  policyId?: string | null;
  policyVersion?: number | null;
  actionScope?: string | null;
  applicationId?: string | null;
  reasonCodes?: string[];
  validityState?: string | null;
}): Promise<string | null> {
  return appendAuditEvent({
    actor_type: "partner",
    actor_id: input.partnerId,
    action: `institutional.security.${input.kind}`,
    object_type: "decision_receipt",
    object_id: input.receiptId ?? null,
    policy_id: input.policyId ?? null,
    policy_version: input.policyVersion ?? null,
    metadata: sanitizeMetadata({
      kind: input.kind,
      correlation_id: input.correlationId ?? undefined,
      receipt_id: input.receiptId ?? undefined,
      policy_id: input.policyId ?? undefined,
      policy_version: input.policyVersion ?? undefined,
      action_scope: input.actionScope ?? undefined,
      application_id: input.applicationId ?? undefined,
      reason_codes: input.reasonCodes ?? [],
      validity_state: input.validityState ?? undefined,
    }),
  });
}
