import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { evaluatePartnerFlow } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import { resolvePartnerFlowParams } from "@/lib/verify/resolveFlowParams";
import { PermissionResolutionError } from "@/lib/verify/resolvePermission";
import { createFlowTraceId, auditPartnerFlowStep } from "@/lib/partner/partnerFlowAudit";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/partner-flow/evaluate
 * Generic relying-party flow evaluation (permission or policy_id).
 */
export async function POST(request: NextRequest) {
  const started = Date.now();
  const flowTraceId = createFlowTraceId();
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: {
    partner_id?: string;
    relying_party_id?: string;
    policy_id?: string;
    permission?: string;
    permission_version?: string;
    return_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnerId = (body.relying_party_id ?? body.partner_id)?.trim();
  const returnUrl = body.return_url?.trim();
  if (!partnerId || !returnUrl) {
    return NextResponse.json(
      { error: "relying_party_id (or partner_id) and return_url are required" },
      { status: 400 },
    );
  }

  let policyId: string;
  try {
    ({ policyId } = resolvePartnerFlowParams({
      relyingPartyId: partnerId,
      policyId: body.policy_id,
      permission: body.permission,
      permissionVersion: body.permission_version,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid permission or policy";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const allowed = await isAllowedPartnerReturnUrl(partnerId, returnUrl);
  if (!allowed) {
    return NextResponse.json(
      { error: "return_url is not allowed for this relying party" },
      { status: 400 },
    );
  }

  try {
    const result = await evaluatePartnerFlow({
      partnerId,
      policyId,
      returnUrl,
      suiAddress: session.session.suiAddress,
    });

    void auditPartnerFlowStep({
      flowTraceId,
      action: "partner_flow.evaluate",
      partnerId,
      policyId,
      subjectId: session.session.suiAddress,
      outcome: result.next,
      verificationRequestId: result.verification_request_id,
      receiptId: result.partner_result?.receipt_id,
      reasonCodes: result.reason_codes,
    });

    void logPartnerUsage({
      endpoint: "/api/v1/partner-flow/evaluate",
      method: "POST",
      success: true,
      responseState: result.next,
      httpStatus: 200,
      responseTimeMs: Date.now() - started,
      policyId,
      decision: result.next,
      proofId: result.partner_result?.receipt_id,
      recordId: result.verification_request_id,
    });

    return NextResponse.json({ ...result, flow_trace_id: flowTraceId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Flow evaluation failed";
    void auditPartnerFlowStep({
      flowTraceId,
      action: "partner_flow.evaluate",
      partnerId,
      policyId,
      subjectId: session.session.suiAddress,
      outcome: "error",
      error: msg,
    });
    void logPartnerUsage({
      endpoint: "/api/v1/partner-flow/evaluate",
      method: "POST",
      success: false,
      httpStatus: 400,
      responseTimeMs: Date.now() - started,
      policyId,
    });
    return NextResponse.json({ error: msg, flow_trace_id: flowTraceId }, { status: 400 });
  }
}
