import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { requireQualifiedPartnerMethod } from "@/lib/partner/requirePartnerMethodQualification";
import { PartnerFlowCompleteRequestError } from "@/lib/partner/partnerFlowCompleteCorrelation";
import {
  attachPartnerSharingConsentCookie,
  signPartnerSharingConsentCookie,
} from "@/lib/partner/partnerSharingConsentCookie";
import { isWalletControlPartnerPolicy } from "@/lib/partner/walletControlPartnerPolicy";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";
import { resolvePartnerFlowCompleteCorrelation } from "@/lib/partner/partnerFlowCompleteCorrelation";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/v1/partner-flow/sharing-consent" as const;

/**
 * POST /api/v1/partner-flow/sharing-consent
 * Records request-bound holder approval to share a wallet-control result (HttpOnly cookie).
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
    sessionSubject: session.session.subjectId,
  });
  if (rateLimited) return rateLimited;

  let body: {
    partner_id?: string;
    policy_id?: string;
    verify_request?: string;
    verification_request_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnerId = body.partner_id?.trim();
  const policyId = body.policy_id?.trim();
  if (!partnerId || !policyId) {
    return NextResponse.json({ error: "partner_id and policy_id are required" }, { status: 400 });
  }

  if (!isWalletControlPartnerPolicy(policyId)) {
    return NextResponse.json({ error: "Sharing consent gate applies to wallet-control policies only" }, { status: 400 });
  }

  let correlation;
  try {
    correlation = resolvePartnerFlowCompleteCorrelation({
      verification_request_id: body.verification_request_id,
      verify_request: body.verify_request,
    });
  } catch (e) {
    if (e instanceof PartnerFlowCompleteRequestError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    throw e;
  }

  const verifyRequestId = correlation.correlationId;
  if (!verifyRequestId) {
    return NextResponse.json({ error: "verify_request is required", code: "missing_verify_request" }, { status: 400 });
  }

  const qualified = await requireQualifiedPartnerMethod({
    request,
    verifyRequestId,
    partnerId,
    policyId,
    sessionSubject: session.session.subjectId,
  });
  if (!qualified.ok) {
    recordPartnerFlowRequestOutcome({
      request,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      sessionSubject: session.session.subjectId,
      partnerId,
      policyId,
      httpStatus: 403,
    });
    return NextResponse.json({
      error: "Wallet control must be verified before sharing approval.",
      code: qualified.code,
    }, { status: 403 });
  }

  const token = await signPartnerSharingConsentCookie({
    verifyRequestId,
    partnerId,
    policyId,
    policyVersion: qualified.record.policyVersion,
  });
  if (!token) {
    return NextResponse.json({ error: "Consent could not be recorded" }, { status: 503 });
  }

  recordPartnerFlowRequestOutcome({
    request,
    endpoint: ENDPOINT,
    method: "POST",
    started,
    sessionSubject: session.session.subjectId,
    partnerId,
    policyId,
    httpStatus: 200,
  });

  const res = NextResponse.json({ ok: true, verify_request: verifyRequestId });
  attachPartnerSharingConsentCookie(res, token);
  return res;
}
