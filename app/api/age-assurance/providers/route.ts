// FILE: app/api/age-assurance/providers/route.ts
// GET configured privacy-preserving age-assurance providers (safe metadata only).

import { NextRequest, NextResponse } from "next/server";
import { listAvailableAgeAssuranceProviderMeta, listConfiguredAgeAssuranceProviderMeta } from "@/lib/assurance/ageProviders/registry";
import {
  ageAssuranceErrorResponse,
  parseRequestedThreshold,
  requireAgeAssuranceSession,
  validateAgeAssurancePartnerContext,
} from "@/lib/assurance/ageProviders/routeHelpers";
import { getHolderCredentialStatus } from "@/lib/partner/relyingPartyFlow";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireAgeAssuranceSession(request);
  if (!session.ok) {
    return ageAssuranceErrorResponse("auth_required", session.error, session.status);
  }

  const partnerId = request.nextUrl.searchParams.get("partner_id")?.trim() ?? "";
  const policyId = request.nextUrl.searchParams.get("policy_id")?.trim() ?? "";
  if (!partnerId || !policyId) {
    return ageAssuranceErrorResponse(
      "missing_params",
      "partner_id and policy_id are required",
      400,
    );
  }

  const ctx = await validateAgeAssurancePartnerContext({ partnerId, policyId });
  if (!ctx.ok) {
    return ageAssuranceErrorResponse(ctx.code, ctx.error, 400);
  }

  const requestedThreshold = parseRequestedThreshold(
    request.nextUrl.searchParams.get("threshold"),
    ctx.threshold,
  );

  const credential = await getHolderCredentialStatus(session.session.suiAddress);
  let existingProofEligible = false;
  if (credential.status === "active" && credential.credential_jti) {
    const evaluation = await evaluatePolicyForSubject({
      suiAddress: session.session.suiAddress,
      policyId,
      partnerId,
    });
    existingProofEligible = evaluation.evaluation.decision === "approved";
  }

  const configured = listConfiguredAgeAssuranceProviderMeta();
  const available = listAvailableAgeAssuranceProviderMeta(requestedThreshold);

  return NextResponse.json({
    ok: true,
    requested_threshold: requestedThreshold,
    existing_proof: {
      status: credential.status,
      eligible_for_reuse: existingProofEligible,
    },
    providers: available,
    unconfigured_count: configured.filter(p => !p.authoritative).length,
  });
}
