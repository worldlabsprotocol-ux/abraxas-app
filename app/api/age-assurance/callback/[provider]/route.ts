// FILE: app/api/age-assurance/callback/[provider]/route.ts
// Provider callback — server-side verification only; never trusts frontend approval.

import { NextRequest, NextResponse } from "next/server";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import { assertKnownProvider } from "@/lib/assurance/ageProviders/registry";
import { issueCredentialFromAgeAssuranceResult } from "@/lib/assurance/ageProviders/eligibility";
import { consumeAgeAssuranceCallback } from "@/lib/assurance/ageProviders/sessionService";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";

export const dynamic = "force-dynamic";

function buildContinueUrl(input: {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  verifyRequestId?: string;
  status: "success" | "failed";
  code?: string;
}): string {
  const origin = getPublicAppOrigin().replace(/\/$/, "");
  const params = new URLSearchParams({
    partner_id: input.partnerId,
    policy_id: input.policyId,
    return: input.returnUrl,
    age_assurance: input.status,
  });
  if (input.verifyRequestId) params.set("verify_request", input.verifyRequestId);
  if (input.code) params.set("age_assurance_code", input.code);
  return `${origin}/partner/continue?${params.toString()}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params;
  const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  const providerSessionId = request.nextUrl.searchParams.get("provider_session_id")?.trim() ?? "";

  if (!state || !providerSessionId) {
    return NextResponse.json({ ok: false, code: "missing_callback_params" }, { status: 400 });
  }

  let provider;
  try {
    provider = assertKnownProvider(providerId);
  } catch {
    return NextResponse.json({ ok: false, code: "unknown_provider" }, { status: 400 });
  }

  if (!provider.isConfigured()) {
    return NextResponse.json({ ok: false, code: "provider_not_configured" }, { status: 503 });
  }

  const callbackPayload: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    callbackPayload[key] = value;
  });

  const verifyResult = await provider.verifyCallback({
    providerSessionId,
    callbackPayload,
    expectedNonce: state,
  });

  const { getAgeAssuranceSessionByNonce } = await import("@/lib/assurance/ageProviders/sessionService");
  const sessionRow = await getAgeAssuranceSessionByNonce(state);
  if (!sessionRow) {
    return NextResponse.json({ ok: false, code: "session_not_found" }, { status: 404 });
  }

  const consumed = await consumeAgeAssuranceCallback({
    sessionNonce: state,
    providerId,
    providerSessionId,
    subjectSuiAddress: sessionRow.subject_sui_address,
    partnerId: sessionRow.partner_id,
    policyId: sessionRow.policy_id,
    ageBand: verifyResult.ageBand,
    assuranceLevel: verifyResult.assuranceLevel,
    evidenceRefHash: verifyResult.evidenceRefHash,
    verified: verifyResult.verified,
    reasonCode: verifyResult.reasonCode,
    expiresAt: verifyResult.expiresAt,
  });

  if (!consumed.ok) {
    const returnUrl = request.nextUrl.searchParams.get("return_url") ?? sessionRow.return_url ?? "";
    if (returnUrl && await isAllowedPartnerReturnUrl(sessionRow.partner_id, returnUrl)) {
      return NextResponse.redirect(
        buildContinueUrl({
          partnerId: sessionRow.partner_id,
          policyId: sessionRow.policy_id,
          returnUrl,
          status: "failed",
          code: consumed.code,
        }),
      );
    }
    return NextResponse.json({ ok: false, code: consumed.code, error: consumed.error }, { status: 400 });
  }

  if (consumed.replay) {
    return NextResponse.json({ ok: false, code: "callback_replay" }, { status: 409 });
  }

  if (!verifyResult.verified) {
    const returnUrl = decodeURIComponent(
      request.nextUrl.searchParams.get("return_url") ?? sessionRow.return_url ?? "",
    );
    if (returnUrl && await isAllowedPartnerReturnUrl(sessionRow.partner_id, returnUrl)) {
      return NextResponse.redirect(
        buildContinueUrl({
          partnerId: sessionRow.partner_id,
          policyId: sessionRow.policy_id,
          returnUrl,
          status: "failed",
          code: verifyResult.reasonCode ?? "provider_result_insufficient",
        }),
      );
    }
    return NextResponse.json({ ok: false, code: "verification_failed" }, { status: 422 });
  }

  const issued = await issueCredentialFromAgeAssuranceResult({
    subjectSuiAddress: sessionRow.subject_sui_address,
    providerId,
    result: {
      verified: verifyResult.verified,
      ageBand: verifyResult.ageBand,
      assuranceLevel: verifyResult.assuranceLevel,
      evidenceRefHash: verifyResult.evidenceRefHash,
      providerId,
      expiresAt: verifyResult.expiresAt,
      reasonCode: verifyResult.reasonCode,
    },
    requestedThreshold: sessionRow.requested_threshold,
    partnerId: sessionRow.partner_id,
    policyId: sessionRow.policy_id,
    sessionId: sessionRow.id,
  });

  if (!issued.ok) {
    return NextResponse.json({ ok: false, code: issued.code, error: issued.error }, { status: 422 });
  }

  const returnUrl = decodeURIComponent(
    request.nextUrl.searchParams.get("return_url") ?? sessionRow.return_url ?? "",
  );
  if (returnUrl && await isAllowedPartnerReturnUrl(sessionRow.partner_id, returnUrl)) {
    return NextResponse.redirect(
      buildContinueUrl({
        partnerId: sessionRow.partner_id,
        policyId: sessionRow.policy_id,
        returnUrl,
        status: "success",
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    code: "credential_issued",
    jti: issued.jti,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const payload = body as { state?: string; provider_session_id?: string; return_url?: string };
  const url = new URL(request.url);
  if (payload.state) url.searchParams.set("state", payload.state);
  if (payload.provider_session_id) url.searchParams.set("provider_session_id", payload.provider_session_id);
  if (payload.return_url) url.searchParams.set("return_url", payload.return_url);

  const getRequest = new NextRequest(url.toString(), { method: "GET" });
  return GET(getRequest, { params: Promise.resolve({ provider: providerId }) });
}
