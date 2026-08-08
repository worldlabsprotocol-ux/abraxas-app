import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { evaluatePartnerFlow, PartnerFlowIdempotencyConflictError } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import { resolvePartnerFlowParams } from "@/lib/verify/resolveFlowParams";
import {
  auditPartnerFlowReceiptOutcome,
  auditPartnerFlowStepBestEffort,
  auditPartnerFlowStepRequired,
  PartnerFlowAuditPersistenceError,
  resolvePartnerFlowTraceId,
} from "@/lib/partner/partnerFlowAudit";
import { buildPartnerFlowVerificationRequestIdempotencyKey } from "@/lib/partner/partnerFlowIdempotency";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";
import { maybeRecordPartnerFlowReceiptMetering } from "@/lib/partner/partnerMeteringHooks";
import { isPartnerFlowRevocationDenied } from "@/lib/partner/partnerFlowRevocationRuntime";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/v1/partner-flow/evaluate" as const;

/**
 * POST /api/v1/partner-flow/evaluate
 * Generic relying-party flow evaluation (permission or policy_id).
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
      appOrigin: getPublicAppOriginFromRequest(request),
    });

    const flowTraceId = resolvePartnerFlowTraceId({
      verificationRequestId: result.verification_request_id,
      decisionId: result.decision_id,
      receiptId: result.partner_result?.receipt_id,
    });

    try {
      await auditPartnerFlowStepRequired({
        flowTraceId,
        action: "partner_flow.evaluate",
        partnerId,
        policyId,
        policyVersion: result.policy_version,
        subjectId: session.session.suiAddress,
        outcome: result.next,
        verificationRequestId: result.verification_request_id,
        decisionId: result.decision_id,
        receiptId: result.partner_result?.receipt_id,
        reasonCodes: result.reason_codes,
        validity: result.validity,
        currentlyValid: result.currently_valid,
        replayStatus: result.replay_status,
      });

      if (result.replay_status && !isPartnerFlowRevocationDenied(result)) {
        await auditPartnerFlowReceiptOutcome({
          flowTraceId,
          partnerId,
          policyId,
          policyVersion: result.policy_version,
          subjectId: session.session.suiAddress,
          outcome: result.replay_status === "issued" ? "issued" : "idempotent_replay",
          verificationRequestId: result.verification_request_id,
          decisionId: result.decision_id,
          receiptId: result.partner_result?.receipt_id,
          reasonCodes: result.reason_codes,
          validity: result.validity,
          currentlyValid: result.currently_valid,
          idempotencyKey: result.verification_request_id
            ? buildPartnerFlowVerificationRequestIdempotencyKey(result.verification_request_id)
            : null,
        }, result.replay_status, "evaluate");
      }
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
      replayStatus: isPartnerFlowRevocationDenied(result) ? null : result.replay_status,
      decision: result.partner_result?.decision,
      receiptId: result.partner_result?.receipt_id,
      policyId,
      decisionId: result.decision_id,
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
      recordId: result.verification_request_id,
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
  } catch (e) {
    if (e instanceof PartnerFlowIdempotencyConflictError) {
      const flowTraceId = resolvePartnerFlowTraceId({});
      return NextResponse.json(
        { error: e.message, code: e.code, flow_trace_id: flowTraceId },
        { status: 409 },
      );
    }
    const msg = e instanceof Error ? e.message : "Flow evaluation failed";
    const flowTraceId = resolvePartnerFlowTraceId({});
    void auditPartnerFlowStepBestEffort({
      flowTraceId,
      action: "partner_flow.evaluate",
      partnerId,
      policyId,
      subjectId: session.session.suiAddress,
      outcome: "error",
      error: msg,
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
    return NextResponse.json({ error: msg, flow_trace_id: flowTraceId }, { status: 400 });
  }
}
