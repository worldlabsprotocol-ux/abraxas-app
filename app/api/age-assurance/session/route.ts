// FILE: app/api/age-assurance/session/route.ts
// POST create an age-assurance provider session.

import { NextRequest, NextResponse } from "next/server";
import {
  assertKnownProvider,
  generateAgeAssuranceSessionNonce,
} from "@/lib/assurance/ageProviders/registry";
import { assertProviderAuthoritative } from "@/lib/assurance/ageProviders/providerAuthority";
import { createAgeAssuranceSessionRow } from "@/lib/assurance/ageProviders/sessionService";
import {
  ageAssuranceErrorResponse,
  parseRequestedThreshold,
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
    endpoint: "/api/v1/partner-flow/evaluate",
    method: "POST",
    started,
    sessionSubject: session.session.suiAddress,
  });
  if (rateLimited) return rateLimited;

  let body: {
    provider_id?: string;
    partner_id?: string;
    policy_id?: string;
    return_url?: string;
    requested_threshold?: number;
  };
  try {
    body = await request.json();
  } catch {
    return ageAssuranceErrorResponse("invalid_json", "Invalid JSON", 400);
  }

  const providerId = body.provider_id?.trim() ?? "";
  const partnerId = body.partner_id?.trim() ?? "";
  const policyId = body.policy_id?.trim() ?? "";
  const returnUrl = body.return_url?.trim() ?? "";
  if (!providerId || !partnerId || !policyId || !returnUrl) {
    return ageAssuranceErrorResponse(
      "missing_params",
      "provider_id, partner_id, policy_id, and return_url are required",
      400,
    );
  }

  const ctx = await validateAgeAssurancePartnerContext({ partnerId, policyId, returnUrl });
  if (!ctx.ok) {
    return ageAssuranceErrorResponse(ctx.code, ctx.error, 400);
  }

  const requestedThreshold = parseRequestedThreshold(body.requested_threshold, ctx.threshold);

  let provider;
  try {
    provider = assertKnownProvider(providerId);
    assertProviderAuthoritative(provider);
  } catch (e) {
    const message = e instanceof Error ? e.message : "provider_not_available";
    const code = message === "provider_not_production_capable"
      ? "provider_not_authoritative"
      : message === "provider_not_configured"
        ? "provider_not_configured"
        : message === "unknown_provider"
          ? "unknown_provider"
          : "provider_not_available";
    const status = code === "unknown_provider" ? 400 : 503;
    return ageAssuranceErrorResponse(code, "Provider not available", status);
  }

  const sessionNonce = generateAgeAssuranceSessionNonce();
  const subjectRef = session.session.suiAddress;

  try {
    const providerSession = await provider.createSession({
      subjectRef,
      requestedThreshold,
      partnerId,
      policyId,
      returnUrl,
      sessionNonce,
    });

    const row = await createAgeAssuranceSessionRow({
      sessionNonce,
      providerId,
      providerSessionId: providerSession.providerSessionId,
      subjectSuiAddress: subjectRef,
      partnerId,
      policyId,
      returnUrl,
      requestedThreshold,
      expiresAt: providerSession.expiresAt,
    });

    if (!row.ok) {
      return ageAssuranceErrorResponse("session_persist_failed", row.error, 500);
    }

    return NextResponse.json({
      ok: true,
      session_nonce: sessionNonce,
      provider_id: providerId,
      redirect_url: providerSession.redirectUrl,
      expires_at: providerSession.expiresAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "session_creation_failed";
    return ageAssuranceErrorResponse("session_creation_failed", message, 500);
  }
}
