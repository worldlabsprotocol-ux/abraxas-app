import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { completePartnerFlowAfterApproval, PartnerFlowIdempotencyConflictError } from "@/lib/partner/relyingPartyFlow";
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
import { buildPartnerFlowVerificationRequestIdempotencyKey } from "@/lib/partner/partnerFlowIdempotency";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";
import { maybeRecordPartnerFlowReceiptMetering } from "@/lib/partner/partnerMeteringHooks";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/v1/partner-flow/complete" as const;

/**
 * POST /api/v1/partner-flow/complete
 * After manual approval + credential issuance, redirect holder to partner.
 */
export async function POST(request: NextRequest) {
  const started = Date.now();
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    recordPartnerFlowRequestOutcome({
      request,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      httpStatus: session.status,
    });
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const rateLimited = await enforcePartnerFlowRateLimit({
    request,
    endpoint: ENDPOINT,
    method: "POST",
    started,
    sessionSubject: session.session.suiAddress,
  });
  if (rateLimited) return rateLimited;

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
      { error: "return_url is not allowed for this partner" },
      { status: 400 },
    );
  }

  const verificationRequestId = body.verification_request_id?.trim();

  let flowTraceId: string | undefined;
  if (verificationRequestId) {
    flowTraceId = resolvePartnerFlowTraceId({ verificationRequestId });
    try {
      rejectMismatchedClientFlowTrace(body.flow_trace_id, flowTraceId);
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

  let result;
  try {
    result = await completePartnerFlowAfterApproval({
      partnerId,
      policyId,
      returnUrl,
      suiAddress: session.session.suiAddress,
      verificationRequestId: body.verification_request_id,
    });
  } catch (e) {
    if (e instanceof PartnerFlowIdempotencyConflictError) {
      const errorTraceId = flowTraceId ?? resolvePartnerFlowTraceId({});
      return NextResponse.json(
        { error: e.message, code: e.code, flow_trace_id: errorTraceId },
        { status: 409 },
      );
    }
    throw e;
  }

  if (!result.ok) {
    const errorTraceId = flowTraceId ?? resolvePartnerFlowTraceId({});
    void auditPartnerFlowStepBestEffort({
      flowTraceId: errorTraceId,
      action: "partner_flow.complete",
      partnerId,
      policyId,
      subjectId: session.session.suiAddress,
      outcome: "error",
      verificationRequestId: body.verification_request_id,
      error: result.error,
    });
    void logPartnerUsage({
      endpoint: ENDPOINT,
      method: "POST",
      success: false,
      httpStatus: 400,
      responseTimeMs: Date.now() - started,
      policyId,
    });
    recordPartnerFlowRequestOutcome({
      request,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      sessionSubject: session.session.suiAddress,
      partnerId,
      policyId,
      httpStatus: 400,
    });
    return NextResponse.json({ error: result.error, flow_trace_id: errorTraceId }, { status: 400 });
  }

  if (!flowTraceId) {
    flowTraceId = resolvePartnerFlowTraceId({
      decisionId: result.decision_id,
      receiptId: result.partner_result?.receipt_id,
    });
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
          verificationRequestId: body.verification_request_id,
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
        reasonCodes: result.partner_result?.reason_codes,
        validity: result.validity,
        currentlyValid: result.currently_valid,
        idempotencyKey: body.verification_request_id
          ? buildPartnerFlowVerificationRequestIdempotencyKey(body.verification_request_id)
          : null,
      }, result.replay_status, "complete");
    }

    await auditPartnerFlowStepRequired({
      flowTraceId,
      action: "partner_flow.complete",
      partnerId,
      policyId,
      policyVersion: result.policy_version,
      subjectId: session.session.suiAddress,
      outcome: result.next,
      verificationRequestId: body.verification_request_id,
      decisionId: result.decision_id,
      receiptId: result.partner_result?.receipt_id,
      reasonCodes: result.partner_result?.reason_codes,
      validity: result.validity,
      currentlyValid: result.currently_valid,
      replayStatus: result.replay_status,
    });
  } catch (e) {
    if (e instanceof PartnerFlowAuditPersistenceError) {
      recordPartnerFlowRequestOutcome({
        request,
        endpoint: ENDPOINT,
        method: "POST",
        started,
        sessionSubject: session.session.suiAddress,
        partnerId,
        policyId,
        httpStatus: 503,
        auditPersistenceFailed: true,
      });
      return NextResponse.json({ error: "Audit persistence failed" }, { status: 503 });
    }
    throw e;
  }

  maybeRecordPartnerFlowReceiptMetering({
    partnerId,
    replayStatus: result.replay_status,
    decision: result.partner_result?.decision,
    receiptId: result.partner_result?.receipt_id,
    policyId,
    decisionId: result.decision_id,
    idempotencyKey: body.verification_request_id
      ? buildPartnerFlowVerificationRequestIdempotencyKey(body.verification_request_id)
      : null,
  });

  void logPartnerUsage({
    endpoint: ENDPOINT,
    method: "POST",
    success: true,
    responseState: result.next,
    httpStatus: 200,
    responseTimeMs: Date.now() - started,
    policyId,
    decision: result.next,
    proofId: result.partner_result?.receipt_id,
    recordId: body.verification_request_id,
  });

  recordPartnerFlowRequestOutcome({
    request,
    endpoint: ENDPOINT,
    method: "POST",
    started,
    sessionSubject: session.session.suiAddress,
    partnerId,
    policyId,
    httpStatus: 200,
  });

  return NextResponse.json({ ...result, flow_trace_id: flowTraceId });
}
