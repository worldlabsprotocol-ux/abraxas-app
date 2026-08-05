// FILE: lib/partner/partnerFlowAuditContract.ts
// Documented Partner Flow audit metadata contract (P1-3) — no PII in metadata.

/** Canonical metadata keys for partner-flow audit_events.metadata. */
export const PARTNER_FLOW_AUDIT_METADATA_KEYS = [
  "flow_trace_id",
  "verification_request_id",
  "partner_id",
  "policy_id",
  "policy_version",
  "decision_id",
  "receipt_id",
  "outcome",
  "validity",
  "currently_valid",
  "replay_status",
  "idempotency_key",
  "reason_codes",
  "error",
] as const;

export type PartnerFlowAuditMetadataKey = (typeof PARTNER_FLOW_AUDIT_METADATA_KEYS)[number];

/** Keys that must never appear in partner-flow audit metadata. */
export const PARTNER_FLOW_PII_FORBIDDEN_METADATA_KEYS = [
  "email",
  "date_of_birth",
  "dob",
  "document_image",
  "document_data",
  "claims_json",
  "claims",
  "credential_jwt",
  "credential_jti",
  "jwt",
  "oauth",
  "access_token",
  "refresh_token",
  "subject_id",
  "sui_address",
  "wallet_address",
] as const;

export type PartnerFlowReplayStatus = "issued" | "idempotent_replay";

export interface PartnerFlowAuditMetadata {
  flow_trace_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number | null;
  verification_request_id: string | null;
  decision_id: string | null;
  receipt_id: string | null;
  outcome: string;
  validity: string | null;
  currently_valid: boolean | null;
  replay_status: PartnerFlowReplayStatus | null;
  idempotency_key: string | null;
  reason_codes: string[];
  error: string | null;
}

export interface BuildPartnerFlowAuditMetadataInput {
  flowTraceId: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number | null;
  verificationRequestId?: string | null;
  decisionId?: string | null;
  receiptId?: string | null;
  outcome: string;
  validity?: string | null;
  currentlyValid?: boolean | null;
  replayStatus?: PartnerFlowReplayStatus | null;
  idempotencyKey?: string | null;
  reasonCodes?: string[];
  error?: string | null;
}

/** Only VR-scoped keys are safe for metadata — session keys embed subject pseudonym. */
export function safeIdempotencyKeyForAudit(key: string | null | undefined): string | null {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("pf_vr:")) return trimmed;
  return null;
}

export function buildPartnerFlowAuditMetadata(
  input: BuildPartnerFlowAuditMetadataInput,
): PartnerFlowAuditMetadata {
  return {
    flow_trace_id: input.flowTraceId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: input.policyVersion ?? null,
    verification_request_id: input.verificationRequestId?.trim() || null,
    decision_id: input.decisionId?.trim() || null,
    receipt_id: input.receiptId?.trim() || null,
    outcome: input.outcome,
    validity: input.validity ?? null,
    currently_valid: input.currentlyValid ?? null,
    replay_status: input.replayStatus ?? null,
    idempotency_key: safeIdempotencyKeyForAudit(input.idempotencyKey),
    reason_codes: input.reasonCodes ?? [],
    error: input.error ?? null,
  };
}

const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const EMAIL_PATTERN = /@[a-z0-9.-]+\.[a-z]{2,}/i;

export function findPartnerFlowAuditMetadataPiiViolations(
  metadata: Record<string, unknown>,
): string[] {
  const violations: string[] = [];

  for (const key of Object.keys(metadata)) {
    const lower = key.toLowerCase();
    if ((PARTNER_FLOW_PII_FORBIDDEN_METADATA_KEYS as readonly string[]).includes(lower)) {
      violations.push(`forbidden_key:${key}`);
    }
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      if (JWT_PATTERN.test(value)) violations.push(`jwt_like_value:${key}`);
      if (EMAIL_PATTERN.test(value)) violations.push(`email_like_value:${key}`);
    }
    if (Array.isArray(value) && key.toLowerCase().includes("claim")) {
      violations.push(`claims_array:${key}`);
    }
  }

  return violations;
}

export const PARTNER_FLOW_AUDIT_ACTIONS = {
  evaluate: "partner_flow.evaluate",
  consent: "partner_flow.consent",
  complete: "partner_flow.complete",
  refresh: "partner_flow.refresh",
  receiptIssued: "partner_flow.receipt_issued",
  idempotentReplay: "partner_flow.idempotent_replay",
  rejected: "partner_flow.rejected",
} as const;

/** Expected high-level event order for passport → complete flows (subset, order-flexible). */
export const PARTNER_FLOW_TRACE_EVENT_ORDER = [
  PARTNER_FLOW_AUDIT_ACTIONS.evaluate,
  PARTNER_FLOW_AUDIT_ACTIONS.consent,
  PARTNER_FLOW_AUDIT_ACTIONS.receiptIssued,
  PARTNER_FLOW_AUDIT_ACTIONS.idempotentReplay,
  PARTNER_FLOW_AUDIT_ACTIONS.complete,
  PARTNER_FLOW_AUDIT_ACTIONS.refresh,
] as const;
