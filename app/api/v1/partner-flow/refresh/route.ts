import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { refreshPartnerSessionReceipt } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import {
  auditPartnerFlowStepBestEffort,
  auditPartnerFlowStepRequired,
  FlowTraceMismatchError,
  PartnerFlowAuditPersistenceError,
  rejectMismatchedClientFlowTrace,
  resolvePartnerFlowTraceId,
} from "@/lib/partner/partnerFlowAudit";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/partner-flow/refresh
 * Re-issue a session receipt when the prior receipt expired but the credential is still valid.
 */
export async function POST(request: NextRequest) {
  const started = Date.now();
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: {
    partner_id?: string;
    policy_id?: string;
    return_url?: string;
    verification_request_id?: string;
    flow_trace_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnerId = body.partner_id?.trim();
  const policyId = body.policy_id?.trim();
  const returnUrl = body.return_url?.trim();
  if (!partnerId || !policyId || !returnUrl) {
    return NextResponse.json(
      { error: "partner_id, policy_id, and return_url are required" },
      { status: 400 },
    );
  }

  const allowed = await isAllowedPartnerReturnUrl(partnerId, returnUrl);
  if (!allowed) {
    return NextResponse.json(
      { error: "return_url is not allowed for this relying party" },
      { status: 400 },
    );
  }

  const verificationRequestId = body.verification_request_id?.trim();

  if (verificationRequestId) {
    const serverTrace = resolvePartnerFlowTraceId({ verificationRequestId });
    try {
      rejectMismatchedClientFlowTrace(body.flow_trace_id, serverTrace);
    } catch (e) {
      if (e instanceof FlowTraceMismatchError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
  }

  try {
    const result = await refreshPartnerSessionReceipt({
      partnerId,
      policyId,
      returnUrl,
      suiAddress: session.session.suiAddress,
    });

    const flowTraceId = resolvePartnerFlowTraceId({
      verificationRequestId,
      receiptId: result.partner_result?.receipt_id,
    });

    if (!verificationRequestId) {
      try {
        rejectMismatchedClientFlowTrace(body.flow_trace_id, flowTraceId);
      } catch (e) {
        if (e instanceof FlowTraceMismatchError) {
          return NextResponse.json({ error: e.message }, { status: 400 });
        }
        throw e;
      }
    }

    try {
      await auditPartnerFlowStepRequired({
        flowTraceId,
        action: "partner_flow.refresh",
        partnerId,
        policyId,
        subjectId: session.session.suiAddress,
        outcome: result.next,
        verificationRequestId: body.verification_request_id,
        receiptId: result.partner_result?.receipt_id,
        reasonCodes: result.reason_codes ?? result.partner_result?.reason_codes,
      });
    } catch (e) {
      if (e instanceof PartnerFlowAuditPersistenceError) {
        return NextResponse.json({ error: "Audit persistence failed" }, { status: 503 });
      }
      throw e;
    }

    void logPartnerUsage({
      endpoint: "/api/v1/partner-flow/refresh",
      method: "POST",
      success: true,
      responseState: result.next,
      httpStatus: 200,
      responseTimeMs: Date.now() - started,
      policyId,
      decision: result.next,
      proofId: result.partner_result?.receipt_id,
    });

    return NextResponse.json({ ...result, flow_trace_id: flowTraceId });
  } catch (e) {
    if (e instanceof FlowTraceMismatchError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Receipt refresh failed";
    const errorTraceId = verificationRequestId
      ? resolvePartnerFlowTraceId({ verificationRequestId })
      : resolvePartnerFlowTraceId({});
    void auditPartnerFlowStepBestEffort({
      flowTraceId: errorTraceId,
      action: "partner_flow.refresh",
      partnerId,
      policyId,
      subjectId: session.session.suiAddress,
      outcome: "error",
      verificationRequestId: body.verification_request_id,
      error: msg,
    });
    void logPartnerUsage({
      endpoint: "/api/v1/partner-flow/refresh",
      method: "POST",
      success: false,
      httpStatus: 400,
      responseTimeMs: Date.now() - started,
      policyId,
    });
    return NextResponse.json({ error: msg, flow_trace_id: errorTraceId }, { status: 400 });
  }
}
