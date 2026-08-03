// FILE: lib/partner/partnerFlowAudit.ts
// Minimal partner-flow audit metadata for IAT reconstruction (P1-3 observability).

import { randomBytes } from "crypto";
import { appendAuditEvent } from "@/lib/verification/audit";

export function createFlowTraceId(): string {
  return `ft_${randomBytes(12).toString("base64url")}`;
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

/** Append partner-flow audit event — no PII, no document data. */
export async function auditPartnerFlowStep(input: PartnerFlowAuditInput): Promise<void> {
  await appendAuditEvent({
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
  });
}
