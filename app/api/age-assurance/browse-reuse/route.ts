// FILE: app/api/age-assurance/browse-reuse/route.ts
// POST reuse an existing Good Trouble browse L0 proof — authenticated, no DOB retained.

import { NextRequest, NextResponse } from "next/server";
import {
  ageAssuranceErrorResponse,
  requireAgeAssuranceSession,
  validateAgeAssurancePartnerContext,
} from "@/lib/assurance/ageProviders/routeHelpers";
import {
  buildBrowseReturnUrl,
  reuseBrowseSelfAttestation,
} from "@/lib/assurance/selfAttestation/reuseBrowseSelfAttestation";
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
    endpoint: "/api/age-assurance/browse-reuse",
    method: "POST",
    started,
    sessionSubject: session.session.suiAddress,
  });
  if (rateLimited) return rateLimited;

  let body: {
    partner_id?: string;
    policy_id?: string;
    return_url?: string;
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

  const result = await reuseBrowseSelfAttestation({
    holderRef: session.session.suiAddress,
    partnerId,
    policyId,
    returnUrl,
  });

  if (!result.ok) {
    const status = result.code === "no_reusable_browse_proof" ? 404 : 400;
    return ageAssuranceErrorResponse(result.code, "Browse proof could not be reused", status);
  }

  const redirectUrl = buildBrowseReturnUrl(returnUrl, {
    browseReceipt: result.browse_receipt,
    browseReceiptId: result.browse_receipt_id,
    policyId,
  });

  return NextResponse.json({
    ok: true,
    age_band: result.age_band,
    expires_at: result.expires_at,
    browse_receipt: result.browse_receipt,
    browse_receipt_id: result.browse_receipt_id,
    ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
  });
}
