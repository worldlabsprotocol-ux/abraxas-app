// FILE: app/api/age-assurance/self-attest/route.ts
// POST tier-1 self-attestation for browse access — DOB never logged or stored.

import { NextRequest, NextResponse } from "next/server";
import {
  ageAssuranceErrorResponse,
  requireAgeAssuranceSession,
} from "@/lib/assurance/ageProviders/routeHelpers";
import { assertSelfAttestOrigin } from "@/lib/assurance/selfAttestation/originGuard";
import { submitSelfAttestation } from "@/lib/assurance/selfAttestation/submitSelfAttestation";
import { enforcePartnerFlowRateLimit } from "@/lib/partner/partnerFlowRouteGuard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const started = Date.now();
  const origin = assertSelfAttestOrigin(request);
  if (!origin.ok) {
    return ageAssuranceErrorResponse(origin.code, "Request origin not allowed", 403);
  }

  const session = await requireAgeAssuranceSession(request);
  if (!session.ok) {
    return ageAssuranceErrorResponse("auth_required", session.error, session.status);
  }

  const rateLimited = await enforcePartnerFlowRateLimit({
    request,
    endpoint: "/api/age-assurance/self-attest",
    method: "POST",
    started,
    sessionSubject: session.session.suiAddress,
  });
  if (rateLimited) return rateLimited;

  let body: {
    date_of_birth?: string;
    partner_id?: string;
    policy_id?: string;
    purpose?: string;
  };
  try {
    body = await request.json();
  } catch {
    return ageAssuranceErrorResponse("invalid_json", "Invalid JSON", 400);
  }

  const dateOfBirth = body.date_of_birth?.trim() ?? "";
  const partnerId = body.partner_id?.trim() ?? "";
  const policyId = body.policy_id?.trim() ?? "";
  const purpose = body.purpose;

  if (!dateOfBirth || !partnerId || !policyId || purpose == null || purpose === "") {
    return ageAssuranceErrorResponse(
      "missing_params",
      "date_of_birth, partner_id, policy_id, and purpose are required",
      400,
    );
  }

  const result = await submitSelfAttestation({
    dateOfBirth,
    partnerId,
    policyId,
    purpose,
    holderRef: session.session.suiAddress,
  });

  if (!result.ok) {
    return ageAssuranceErrorResponse(result.code, "Self-attestation could not be completed", result.status);
  }

  return NextResponse.json({
    ok: true,
    age_band: result.age_band,
    assurance_level: result.assurance_level,
    purpose: result.purpose,
    valid_for_purchase: result.valid_for_purchase,
    expires_at: result.expires_at,
    ...(result.browse_receipt ? { browse_receipt: result.browse_receipt } : {}),
    ...(result.browse_receipt_id ? { browse_receipt_id: result.browse_receipt_id } : {}),
  });
}
