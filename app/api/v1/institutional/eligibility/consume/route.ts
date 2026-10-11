// POST /api/v1/institutional/eligibility/consume — partner-scoped fail-closed receipt consumption.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { consumeInstitutionalEligibility } from "@/lib/institutional/consumeInstitutionalEligibility";
import { INSTITUTIONAL_ELIGIBILITY_NOTICE } from "@/lib/institutional/eligibilityDecisionContract";
import { appendAuditEvent } from "@/lib/verification/audit";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";
import { enforcePartnerFlowRateLimit } from "@/lib/partner/partnerFlowRouteGuard";

export const dynamic = "force-dynamic";

type Body = {
  receipt_id?: string;
  policy_id?: string;
  policy_version?: number;
  purpose?: string;
  action_scope?: string;
  application_id?: string;
  correlation_id?: string;
  replay_nonce?: string;
};

export async function POST(req: NextRequest) {
  const started = Date.now();
  const limited = await enforcePartnerFlowRateLimit({
    request: req,
    endpoint: "/api/v1/institutional/eligibility/consume",
    method: "POST",
    started,
  });
  if (limited) return limited;

  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Body;
  try {
    body = await req.json() as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const receiptId = body.receipt_id?.trim();
  const policyId = body.policy_id?.trim();
  if (!receiptId || !policyId) {
    return NextResponse.json({ error: "receipt_id and policy_id required" }, { status: 400 });
  }

  const result = await consumeInstitutionalEligibility({
    partnerId: auth.partnerId,
    receiptId,
    policyId,
    policyVersion: body.policy_version,
    purpose: body.purpose ?? null,
    actionScope: body.action_scope ?? null,
    applicationId: body.application_id ?? null,
    correlationId: body.correlation_id ?? null,
    replayNonce: body.replay_nonce ?? null,
    allowSandbox: auth.ctx?.credentialEnvironment !== "production",
  });

  const auditId = await appendAuditEvent({
    actor_type: "partner",
    actor_id: auth.partnerId,
    action: "institutional.eligibility.consume",
    object_type: "decision_receipt",
    object_id: receiptId,
    policy_id: policyId,
    policy_version: body.policy_version ?? null,
    metadata: {
      correlation_id: body.correlation_id ?? null,
      outcome: result.ok ? "permit" : result.decision?.outcome ?? "deny",
      application_id: body.application_id ?? null,
      action_scope: body.action_scope ?? null,
    },
  });

  if (result.decision) {
    result.decision.audit_event_id = auditId;
  }

  void logPartnerUsage({
    endpoint: "/api/v1/institutional/eligibility/consume",
    method: "POST",
    success: result.ok,
    partner: auth.ctx,
    httpStatus: result.ok ? 200 : result.status,
    responseTimeMs: Date.now() - started,
    recordId: receiptId,
    policyId,
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.error,
      decision: result.decision ?? null,
      notice: INSTITUTIONAL_ELIGIBILITY_NOTICE,
    }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    decision: result.decision,
    narrow_result: result.narrow_result ?? null,
    notice: INSTITUTIONAL_ELIGIBILITY_NOTICE,
  });
}
