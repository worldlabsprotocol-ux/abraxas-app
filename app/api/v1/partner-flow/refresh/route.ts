import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { refreshPartnerSessionReceipt, PartnerFlowIdempotencyConflictError } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import {
  auditPartnerFlowReceiptOutcome,
  auditPartnerFlowStepBestEffort,
  auditPartnerFlowStepRequired,
  FlowTraceMismatchError,
  PartnerFlowAuditPersistenceError,
  rejectMismatchedClientFlowTrace,
  resolvePartnerFlowTraceId,
} from "@/lib/partner/partnerFlowAudit";
import {
  buildPartnerFlowSessionIdempotencyKey,
  buildPartnerFlowVerificationRequestIdempotencyKey,
} from "@/lib/partner/partnerFlowIdempotency";
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
        void auditPartnerFlowStepBestEffort({
          flowTraceId: resolvePartnerFlowTraceId({ verificationRequestId }),
          action: "partner_flow.rejected",
          partnerId,
          policyId,
          subjectId: session.session.suiAddress,
          outcome: "rejected",
          verificationRequestId,
          error: e.message,
          errorCode: "flow_trace_id_mismatch",
        });
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
      decisionId: result.decision_id,
      receiptId: result.partner_result?.receipt_id,
    });

    if (!verificationRequestId) {
      try {
        rejectMismatchedClientFlowTrace(body.flow_trace_id, flowTraceId);
      } catch (e) {
        if (e instanceof FlowTraceMismatchError) {
          void auditPartnerFlowStepBestEffort({
            flowTraceId,
            action: "partner_flow.rejected",
            partnerId,
            policyId,
            subjectId: session.session.suiAddress,
            outcome: "rejected",
            error: e.message,
            errorCode: "flow_trace_id_mismatch",
          });
          return NextResponse.json({ error: e.message }, { status: 400 });
        }
        throw e;
      }
    }

    try {
      if (result.replay_status) {
        await auditPartnerFlowReceiptOutcome({
          flowTraceId,
          partnerId,
          policyId,
          policyVersion: result.policy_version,
          subjectId: session.session.suiAddress,
          outcome: result.replay_status === "issued" ? "issued" : "idempotent_replay",
          verificationRequestId: body.verification_request_id,
          decisionId: result.decision_id,
          receiptId: result.partner_result?.receipt_id,
          replacedReceiptId: result.replaced_receipt_id,
          reasonCodes: result.reason_codes ?? result.partner_result?.reason_codes,
          validity: result.validity,
          currentlyValid: result.currently_valid,
          idempotencyKey: verificationRequestId
            ? buildPartnerFlowVerificationRequestIdempotencyKey(verificationRequestId)
            : buildPartnerFlowSessionIdempotencyKey({
              partnerId,
              subjectId: session.session.suiAddress,
              policyId,
            }),
        }, result.replay_status, "refresh");
      }

      await auditPartnerFlowStepRequired({
        flowTraceId,
        action: "partner_flow.refresh",
        partnerId,
        policyId,
        policyVersion: result.policy_version,
        subjectId: session.session.suiAddress,
        outcome: result.next,
        verificationRequestId: body.verification_request_id,
        decisionId: result.decision_id,
        receiptId: result.partner_result?.receipt_id,
        reasonCodes: result.reason_codes ?? result.partner_result?.reason_codes,
        validity: result.validity,
        currentlyValid: result.currently_valid,
        replayStatus: result.replay_status,
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
    if (e instanceof PartnerFlowIdempotencyConflictError) {
      const errorTraceId = verificationRequestId
        ? resolvePartnerFlowTraceId({ verificationRequestId })
        : resolvePartnerFlowTraceId({});
      return NextResponse.json(
        { error: e.message, code: e.code, flow_trace_id: errorTraceId },
        { status: 409 },
      );
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
