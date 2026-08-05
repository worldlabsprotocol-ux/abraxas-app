// FILE: app/api/openid4vp/presentation-request/route.ts
// OpenID4VP — create presentation request (scaffold; maps to verification_requests).

import { NextRequest, NextResponse } from "next/server";
import { buildPresentationRequest, presentationRequestUrl } from "@/lib/openid4vp/presentation";
import { createVerificationRequest } from "@/lib/verification/requestsService";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";

export async function POST(req: NextRequest) {
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    policy_id?: string;
    requested_action?: string;
    requested_claims?: string[];
    redirect_uri?: string;
    sui_address?: string;
  };

  if (!body.policy_id) {
    return NextResponse.json({ error: "policy_id required" }, { status: 400 });
  }

  try {
    const vr = await createVerificationRequest({
      partnerId: auth.partnerId,
      policyId: body.policy_id,
      requestedAction: body.requested_action,
      requestedClaims: body.requested_claims,
      suiAddress: body.sui_address,
    });

    const appOrigin = getPublicAppOriginFromRequest(req);

    const oidc = buildPresentationRequest({
      partnerId: auth.partnerId,
      policyId: body.policy_id,
      requestedClaims: body.requested_claims ?? [],
      redirectUri: body.redirect_uri,
      appOrigin,
    });

    return NextResponse.json({
      verification_request_id: vr.request_id,
      consent_url: vr.consent_url,
      openid4vp: {
        ...oidc,
        presentation_url: presentationRequestUrl(oidc, appOrigin),
      },
      note: "OpenID4VP scaffold — holder completes consent at consent_url today.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
