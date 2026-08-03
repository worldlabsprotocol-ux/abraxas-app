// FILE: lib/partner/partnerFlowAudit.ts
// Minimal partner-flow audit metadata for IAT reconstruction (P1-3 observability).

import { randomBytes } from "crypto";
import { appendAuditEvent } from "@/lib/verification/audit";

export const FLOW_TRACE_VR_PREFIX = "ft_vr_";
export const FLOW_TRACE_DEC_PREFIX = "ft_dec_";
export const FLOW_TRACE_RC_PREFIX = "ft_rc_";

export function createFlowTraceId(): string {
  return `ft_${randomBytes(12).toString("base64url")}`;
}

export function flowTraceIdFromVerificationRequest(requestId: string): string {
  return `${FLOW_TRACE_VR_PREFIX}${requestId}`;
}

/** Resolve durable flow trace from existing flow identifiers (no new tracing platform). */
export function resolvePartnerFlowTraceId(input: {
  flowTraceId?: string | null;
  verificationRequestId?: string | null;
  decisionId?: string | null;
  receiptId?: string | null;
}): string {
  const explicit = input.flowTraceId?.trim();
  if (explicit) return explicit;

  const verificationRequestId = input.verificationRequestId?.trim();
  if (verificationRequestId) return flowTraceIdFromVerificationRequest(verificationRequestId);

  const decisionId = input.decisionId?.trim();
  if (decisionId) return `${FLOW_TRACE_DEC_PREFIX}${decisionId}`;

  const receiptId = input.receiptId?.trim();
  if (receiptId) return `${FLOW_TRACE_RC_PREFIX}${receiptId}`;

  return createFlowTraceId();
}

export interface PartnerFlowAuditInput {
  flowTraceId: string;
  action: string;
  partnerId: string;
  policyId: string;
  subjectId: string;
  outcome: string;
  decisionId?: string | null;
  receiptId?: string | null;
  verificationRequestId?: string | null;
  reasonCodes?: string[];
  error?: string | null;
}

export class PartnerFlowAuditPersistenceError extends Error {
  constructor(message = "audit_persistence_failed") {
    super(message);
    this.name = "PartnerFlowAuditPersistenceError";
  }
}

function toAuditEvent(input: PartnerFlowAuditInput) {
  return {
    actor_type: "subject",
    actor_id: input.subjectId,
    action: input.action,
    object_type: input.receiptId ? "decision_receipt" : "verification_decision",
    object_id: input.receiptId ?? input.decisionId ?? null,
    policy_id: input.policyId,
    metadata: {
      flow_trace_id: input.flowTraceId,
      partner_id: input.partnerId,
      outcome: input.outcome,
      decision_id: input.decisionId ?? null,
      receipt_id: input.receiptId ?? null,
      verification_request_id: input.verificationRequestId ?? null,
      reason_codes: input.reasonCodes ?? [],
      error: input.error ?? null,
    },
  };
}

/** Required for successful partner-flow responses — fails when audit cannot be persisted. */
export async function auditPartnerFlowStepRequired(input: PartnerFlowAuditInput): Promise<string> {
  const auditId = await appendAuditEvent(toAuditEvent(input));
  if (!auditId) throw new PartnerFlowAuditPersistenceError();
  return auditId;
}

/** Error-path auditing — never throws; does not alter the HTTP response. */
export async function auditPartnerFlowStepBestEffort(input: PartnerFlowAuditInput): Promise<void> {
  try {
    const auditId = await appendAuditEvent(toAuditEvent(input));
    if (!auditId) {
      console.error("[partnerFlowAudit] audit persistence failed (best-effort)", input.action);
    }
  } catch (e) {
    console.error("[partnerFlowAudit] audit error (best-effort)", input.action, e);
  }
}

/** @deprecated Use auditPartnerFlowStepRequired or auditPartnerFlowStepBestEffort */
export async function auditPartnerFlowStep(input: PartnerFlowAuditInput): Promise<void> {
  await auditPartnerFlowStepRequired(input);
}
