// FILE: app/api/age-assurance/reuse/route.ts
// POST re-evaluate existing Abraxas credential and issue fresh partner-bound receipt.

import { NextRequest, NextResponse } from "next/server";
import { reuseExistingAgeCredential } from "@/lib/assurance/ageProviders/reuseService";
import {
  ageAssuranceErrorResponse,
  requireAgeAssuranceSession,
  validateAgeAssurancePartnerContext,
} from "@/lib/assurance/ageProviders/routeHelpers";
import { enforcePartnerFlowRateLimit } from "@/lib/partner/partnerFlowRouteGuard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const started = Date.now();
  const session = await requireAgeAssuranceSession(request);
  if (!session.ok) {
    return ageAssuranceErrorResponse("auth_required", session.error, session.status);
  }

  const rateLimited = await enforcePartnerFlowRateLimit({
    request,
    endpoint: "/api/v1/partner-flow/complete",
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
  };
  try {
    body = await request.json();
  } catch {
    return ageAssuranceErrorResponse("invalid_json", "Invalid JSON", 400);
  }

  const partnerId = body.partner_id?.trim() ?? "";
  const policyId = body.policy_id?.trim() ?? "";
  const returnUrl = body.return_url?.trim() ?? "";
  if (!partnerId || !policyId || !returnUrl) {
    return ageAssuranceErrorResponse(
      "missing_params",
      "partner_id, policy_id, and return_url are required",
      400,
    );
  }

  const ctx = await validateAgeAssurancePartnerContext({ partnerId, policyId, returnUrl });
  if (!ctx.ok) {
    return ageAssuranceErrorResponse(ctx.code, ctx.error, 400);
  }

  const result = await reuseExistingAgeCredential({
    suiAddress: session.session.suiAddress,
    partnerId,
    policyId,
    returnUrl,
    verificationRequestId: body.verification_request_id?.trim(),
  });

  if (!result.ok) {
    const status = result.code === "policy_not_satisfied" ? 422 : 400;
    return ageAssuranceErrorResponse(result.code, result.error, status);
  }

  return NextResponse.json({
    ok: true,
    redirect_url: result.redirect_url,
    decision_id: result.decision_id,
    receipt_id: result.receipt_id,
    replay_status: result.replay_status,
  });
}
