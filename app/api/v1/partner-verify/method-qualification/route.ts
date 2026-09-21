// FILE: app/api/v1/partner-verify/method-qualification/route.ts
// Start/complete a Partner Flow method. Qualification is server-verified and never a receipt.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { CONTINUATION_STORE_UNAVAILABLE } from "@/lib/partner/partnerFlowContinuation";
import {
  evaluateMethodQualification,
  publicQualificationView,
  qualificationMatchesBinding,
} from "@/lib/partner/partnerMethodQualification";
import {
  attachPartnerMethodQualificationCookie,
  clearPartnerMethodQualificationCookie,
  PARTNER_METHOD_QUALIFICATION_COOKIE,
  signPartnerMethodQualificationCookie,
  verifyPartnerMethodQualificationCookie,
} from "@/lib/partner/partnerMethodQualificationCookie";
import { resolveBoundPartnerContinuation } from "@/lib/partner/resolveBoundPartnerContinuation";
import {
  attachPartnerContinueBindingCookie,
  clearPartnerContinueBindingCookie,
  signPartnerContinueBindingCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";
import { rejectReuseClientAuthority, reuseOptionForContinuation } from "@/lib/passport/reusableEligibility";
import { resolveCompatibleReusableFact } from "@/lib/passport/reusableEligibility/qualify";
import { holderHasAcceptedReclaim } from "@/lib/reclaimAttestation";
import { reclaimRouteForPolicy } from "@/lib/reclaimAttestation/policyFit";

export const dynamic = "force-dynamic";

function failStatus(code: string): number {
  return code === CONTINUATION_STORE_UNAVAILABLE ? 503 : 400;
}

export async function GET(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error, method_qualified: false, issuedReceipt: false }, { status: session.status });
  }

  const verifyRequest = request.nextUrl.searchParams.get("verify_request")?.trim() ?? "";
  if (!verifyRequest) {
    return NextResponse.json({ ok: false, code: "missing", method_qualified: false, issuedReceipt: false }, { status: 400 });
  }

  const bound = await resolveBoundPartnerContinuation({
    request,
    verifyRequestId: verifyRequest,
    sessionSubject: session.session.suiAddress,
  });
  if (!bound.ok) {
    const res = NextResponse.json({
      ok: false,
      code: bound.code,
      method_qualified: false,
      issuedReceipt: false,
    }, { status: failStatus(bound.code) });
    if (bound.clearBinding) clearPartnerContinueBindingCookie(res);
    clearPartnerMethodQualificationCookie(res);
    return res;
  }

  const qToken = request.cookies.get(PARTNER_METHOD_QUALIFICATION_COOKIE)?.value;
  const record = qToken ? await verifyPartnerMethodQualificationCookie(qToken) : null;
  const matched = qualificationMatchesBinding({
    record,
    verifyRequestId: verifyRequest,
    partnerId: bound.stored.partnerId,
    policyId: bound.stored.policyId,
    policyVersion: bound.stored.policyVersion,
  });
  const reuse = await reuseOptionForContinuation({
    subjectId: session.session.suiAddress,
    targetPolicyId: bound.stored.policyId,
    targetPolicyVersion: bound.stored.policyVersion ?? 1,
  });
  const res = NextResponse.json({
    ...publicQualificationView(matched ? record : null),
    reuse,
  });
  if (!matched) clearPartnerMethodQualificationCookie(res);
  return res;
}

export async function POST(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error, method_qualified: false, issuedReceipt: false }, { status: session.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    body = {};
  }

  const verifyRequest = typeof body.verify_request === "string" ? body.verify_request.trim() : "";
  const methodId = typeof body.method_id === "string" ? body.method_id.trim() : "";
  if (!verifyRequest || !methodId) {
    return NextResponse.json({ ok: false, code: "missing", method_qualified: false, issuedReceipt: false }, { status: 400 });
  }
  if (rejectReuseClientAuthority(body)) {
    return NextResponse.json({
      ok: false,
      code: "disclosure_rejected",
      method_qualified: false,
      issuedReceipt: false,
    }, { status: 400 });
  }

  const bound = await resolveBoundPartnerContinuation({
    request,
    verifyRequestId: verifyRequest,
    sessionSubject: session.session.suiAddress,
  });
  if (!bound.ok) {
    const res = NextResponse.json({
      ok: false,
      code: bound.code,
      method_qualified: false,
      issuedReceipt: false,
    }, { status: failStatus(bound.code) });
    if (bound.clearBinding) clearPartnerContinueBindingCookie(res);
    clearPartnerMethodQualificationCookie(res);
    return res;
  }

  let existingProofCompatible = false;
  if (methodId === "reuse_existing_proof") {
    const resolved = await resolveCompatibleReusableFact({
      subjectId: session.session.suiAddress,
      targetPolicyId: bound.stored.policyId,
      targetPolicyVersion: bound.stored.policyVersion ?? 1,
    });
    existingProofCompatible = resolved.ok;
  }

  const reclaimRoute = reclaimRouteForPolicy(bound.stored.policyId, "sandbox");
  const reclaimRequired = methodId === "privacy_preserving" && Boolean(reclaimRoute?.available);
  let reclaimSessionAccepted = false;
  if (reclaimRequired) {
    reclaimSessionAccepted = await holderHasAcceptedReclaim({
      holderSubject: session.session.suiAddress,
      verifyRequest,
      policyId: bound.stored.policyId,
      policyVersion: bound.stored.policyVersion ?? 1,
      environment: "sandbox",
    });
  }

  const evaluated = evaluateMethodQualification({
    methodId,
    verifyRequestId: verifyRequest,
    storedPartnerId: bound.stored.partnerId,
    storedPolicyId: bound.stored.policyId,
    storedPolicyVersion: bound.stored.policyVersion,
    claimedPartnerId: typeof body.partner_id === "string" ? body.partner_id : undefined,
    claimedPolicyId: typeof body.policy_id === "string" ? body.policy_id : undefined,
    claimedPolicyVersion: typeof body.policy_version === "number" ? body.policy_version : undefined,
    existingProofCompatible,
    reclaimRequired,
    reclaimSessionAccepted,
  });

  if (!evaluated.ok) {
    const res = NextResponse.json({
      ok: false,
      code: evaluated.code,
      method_selected: true,
      method_qualified: false,
      issuedReceipt: false,
    }, { status: 400 });
    clearPartnerMethodQualificationCookie(res);
    return res;
  }

  const token = await signPartnerMethodQualificationCookie(evaluated.record);
  const rebound = await signPartnerContinueBindingCookie({ verifyRequestId: verifyRequest });
  const res = NextResponse.json({
    ok: true,
    method_selected: true,
    method_qualified: true,
    issuedReceipt: false,
    sandbox_only: evaluated.record.sandboxOnly,
  });
  if (token) attachPartnerMethodQualificationCookie(res, token);
  if (rebound) attachPartnerContinueBindingCookie(res, rebound);
  return res;
}
