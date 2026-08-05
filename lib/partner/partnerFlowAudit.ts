// FILE: lib/partner/partnerFlowAudit.ts
// Partner-flow audit metadata for IAT reconstruction (P1-3 observability).

import { randomBytes } from "crypto";
import { appendAuditEvent } from "@/lib/verification/audit";
import {
  buildPartnerFlowAuditMetadata,
  PARTNER_FLOW_AUDIT_ACTIONS,
  type PartnerFlowReplayStatus,
} from "@/lib/partner/partnerFlowAuditContract";

export const FLOW_TRACE_VR_PREFIX = "ft_vr_";
export const FLOW_TRACE_DEC_PREFIX = "ft_dec_";
export const FLOW_TRACE_RC_PREFIX = "ft_rc_";

export function createFlowTraceId(): string {
  return `ft_${randomBytes(12).toString("base64url")}`;
}

export function flowTraceIdFromVerificationRequest(requestId: string): string {
  return `${FLOW_TRACE_VR_PREFIX}${requestId}`;
}

/** Server-derived flow trace — never accepts client-supplied flow_trace_id. */
export function resolvePartnerFlowTraceId(input: {
  verificationRequestId?: string | null;
  decisionId?: string | null;
  receiptId?: string | null;
}): string {
  const verificationRequestId = input.verificationRequestId?.trim();
  if (verificationRequestId) return flowTraceIdFromVerificationRequest(verificationRequestId);

  const decisionId = input.decisionId?.trim();
  if (decisionId) return `${FLOW_TRACE_DEC_PREFIX}${decisionId}`;

  const receiptId = input.receiptId?.trim();
  if (receiptId) return `${FLOW_TRACE_RC_PREFIX}${receiptId}`;

  return createFlowTraceId();
}

export class FlowTraceMismatchError extends Error {
  constructor(message = "flow_trace_id does not match verification_request_id") {
    super(message);
    this.name = "FlowTraceMismatchError";
  }
}

/**
 * Reject client-supplied flow_trace_id when it disagrees with the server-derived trace.
 * flow_trace_id is response-only metadata — not an authoritative client input.
 */
export function rejectMismatchedClientFlowTrace(
  clientFlowTraceId: string | null | undefined,
  serverFlowTraceId: string,
): void {
  const client = clientFlowTraceId?.trim();
  if (!client) return;
  if (client !== serverFlowTraceId) {
    throw new FlowTraceMismatchError();
  }
}

export interface PartnerFlowAuditInput {
  flowTraceId: string;
  action: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number | null;
  subjectId: string;
  outcome: string;
  decisionId?: string | null;
  receiptId?: string | null;
  verificationRequestId?: string | null;
  reasonCodes?: string[];
  error?: string | null;
  validity?: string | null;
  currentlyValid?: boolean | null;
  replayStatus?: PartnerFlowReplayStatus | null;
  idempotencyKey?: string | null;
}

export type PartnerFlowAuditContext = Omit<PartnerFlowAuditInput, "action">;

export class PartnerFlowAuditPersistenceError extends Error {
  constructor(message = "audit_persistence_failed") {
    super(message);
    this.name = "PartnerFlowAuditPersistenceError";
  }
}

function toAuditEvent(input: PartnerFlowAuditInput) {
  const metadata = buildPartnerFlowAuditMetadata({
    flowTraceId: input.flowTraceId,
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    verificationRequestId: input.verificationRequestId,
    decisionId: input.decisionId,
    receiptId: input.receiptId,
    outcome: input.outcome,
    validity: input.validity,
    currentlyValid: input.currentlyValid,
    replayStatus: input.replayStatus,
    idempotencyKey: input.idempotencyKey,
    reasonCodes: input.reasonCodes,
    error: input.error,
  });

  return {
    actor_type: "system",
    actor_id: "partner_flow",
    action: input.action,
    object_type: input.receiptId ? "decision_receipt" : "verification_decision",
    object_id: input.receiptId ?? input.decisionId ?? null,
    policy_id: input.policyId,
    policy_version: input.policyVersion ?? null,
    metadata: metadata as unknown as Record<string, unknown>,
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

/** Fresh receipt issuance — never called on idempotent replay. */
export async function auditPartnerFlowReceiptIssued(input: PartnerFlowAuditContext): Promise<void> {
  await auditPartnerFlowStepBestEffort({
    ...input,
    action: PARTNER_FLOW_AUDIT_ACTIONS.receiptIssued,
    replayStatus: "issued",
  });
}

/** Idempotent replay evidence — distinct from receipt_issued; no duplicate receipt. */
export async function auditPartnerFlowIdempotentReplay(input: PartnerFlowAuditContext): Promise<void> {
  await auditPartnerFlowStepBestEffort({
    ...input,
    action: PARTNER_FLOW_AUDIT_ACTIONS.idempotentReplay,
    replayStatus: "idempotent_replay",
  });
}

/** @deprecated Use auditPartnerFlowStepRequired or auditPartnerFlowStepBestEffort */
export async function auditPartnerFlowStep(input: PartnerFlowAuditInput): Promise<void> {
  await auditPartnerFlowStepRequired(input);
}
