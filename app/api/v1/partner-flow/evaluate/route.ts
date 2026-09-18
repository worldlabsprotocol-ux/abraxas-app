import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { evaluatePartnerFlow, PartnerFlowIdempotencyConflictError } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
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
import {
  maybeEnqueuePartnerDecisionDenied,
  maybeEnqueuePartnerReceiptExpired,
  maybeEnqueuePartnerReceiptIssued,
} from "@/lib/partner/webhooks/webhookHooks";
import { isPartnerFlowRevocationDenied } from "@/lib/partner/partnerFlowRevocationRuntime";
import { enrichPartnerFlowResponse } from "@/lib/partner/enrichPartnerFlowResponse";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import {
  GoodTroubleFlowTupleMismatchError,
  resolveGoodTroubleFlowPurpose,
} from "@/lib/partner/goodTroubleBrowseFlow";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";
import { extractLaunchpadFlowContext } from "@/lib/partner/launchpad/extractLaunchpadFlowContext";
import { recordEvaluateLaunchpadActivity, recordFlowFailureActivity } from "@/lib/partner/launchpad/mapPartnerFlowActivity";
import { resolveLaunchpadPinnedPolicyVersion } from "@/lib/partner/launchpad/resolvePinnedPolicyVersion";
import { PolicyChangeControlError } from "@/lib/policy/changeControl/codes";

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
    purpose?: string;
    return_url?: string;
    app?: string;
    launchpad_application_id?: string;
    application_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalized = normalizePartnerVerifyInput({
    partnerId: body.partner_id,
    relyingPartyId: body.relying_party_id,
    policyId: body.policy_id,
    purpose: body.purpose,
    returnUrl: body.return_url,
    permission: body.permission,
    permissionVersion: body.permission_version,
  });
  if (!normalized.ok) {
    return NextResponse.json(
      { error: normalized.invalidLinkMessage, code: normalized.code },
      { status: 400 },
    );
  }

  const {
    partnerId,
    policyId,
    returnUrl,
    permission,
    permissionVersion,
  } = normalized.params;

  const launchpadContext = extractLaunchpadFlowContext(body);

  const allowed = await isAllowedPartnerReturnUrl(partnerId, returnUrl);
  if (!allowed) {
    void recordFlowFailureActivity({
      context: launchpadContext,
      partnerId,
      policyId,
      publicCode: "return_url_rejected",
      eventType: "callback_failed",
    });
    return NextResponse.json(
      { error: "return_url is not allowed for this relying party" },
      { status: 400 },
    );
  }

  let resolvedPurpose = normalized.params.purpose?.trim() || undefined;
  try {
    const goodTroublePurpose = resolveGoodTroubleFlowPurpose({
      partnerId,
      policyId,
      purpose: normalized.params.purpose,
      returnUrl,
    });
    if (goodTroublePurpose) {
      resolvedPurpose = goodTroublePurpose;
    }
  } catch (e) {
    if (e instanceof GoodTroubleFlowTupleMismatchError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    throw e;
  }

  try {
    const expectedPolicyVersion = await resolveLaunchpadPinnedPolicyVersion({
      context: launchpadContext,
      partnerId,
      policyId,
    });
    const result = await evaluatePartnerFlow({
      partnerId,
      policyId,
      purpose: resolvedPurpose,
      returnUrl,
      suiAddress: session.session.suiAddress,
      appOrigin: getPublicAppOriginFromRequest(request),
      expectedPolicyVersion,
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

    maybeEnqueuePartnerReceiptIssued({
      partnerId,
      replayStatus: isPartnerFlowRevocationDenied(result) ? null : result.replay_status,
      decision: result.partner_result?.decision,
      receiptId: result.partner_result?.receipt_id,
      policyId,
      policyVersion: result.policy_version,
      decisionId: result.decision_id,
    });

    maybeEnqueuePartnerDecisionDenied({
      partnerId,
      decision: result.partner_result?.decision,
      receiptId: result.partner_result?.receipt_id,
      policyId,
      policyVersion: result.policy_version,
      decisionId: result.decision_id,
    });

    maybeEnqueuePartnerReceiptExpired({
      partnerId,
      status: result.validity === "expired" || result.invalidation_reasons?.includes("expired") ? "expired" : null,
      receiptId: result.partner_result?.receipt_id,
      policyId,
      policyVersion: result.policy_version,
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

    void recordEvaluateLaunchpadActivity({
      context: launchpadContext,
      partnerId,
      policyId,
      correlationId: flowTraceId,
      next: result.next,
      replayStatus: isPartnerFlowRevocationDenied(result) ? null : result.replay_status,
      hasRedirectUrl: Boolean(result.redirect_url),
    });

    return NextResponse.json({ ...enrichPartnerFlowResponse(result), flow_trace_id: flowTraceId });
  } catch (e) {
    if (e instanceof PolicyChangeControlError) {
      const flowTraceId = resolvePartnerFlowTraceId({});
      return NextResponse.json(
        { error: e.message, code: e.code, flow_trace_id: flowTraceId },
        { status: 409 },
      );
    }
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
    void recordFlowFailureActivity({
      context: launchpadContext,
      partnerId,
      policyId,
      correlationId: flowTraceId,
      publicCode: "evaluation_failed",
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
