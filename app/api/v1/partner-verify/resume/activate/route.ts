// FILE: app/api/v1/partner-verify/resume/activate/route.ts
// Resume the exact pending /partner/continue flow after a browser session exists.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { activatePartnerFlowContinuation } from "@/lib/partner/activatePartnerFlowContinuation";
import { resolveContinuationStore } from "@/lib/partner/resolveContinuationStore";
import {
  attachPartnerContinueBindingCookie,
  clearPartnerVerifyResumeCookie,
  PARTNER_VERIFY_RESUME_COOKIE,
  signPartnerContinueBindingCookie,
  verifyPartnerVerifyResumeCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error, code: "auth_required" }, { status: session.status });
  }

  const token = request.cookies.get(PARTNER_VERIFY_RESUME_COOKIE)?.value;
  const payload = token ? await verifyPartnerVerifyResumeCookie(token) : null;

  let claimed: {
    partnerId?: string;
    policyId?: string;
    policyVersion?: number;
    returnUrl?: string;
  } = {};
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.partnerId === "string") claimed.partnerId = body.partnerId;
    if (typeof body.policyId === "string") claimed.policyId = body.policyId;
    if (typeof body.policyVersion === "number") claimed.policyVersion = body.policyVersion;
    if (typeof body.returnUrl === "string") claimed.returnUrl = body.returnUrl;
  } catch {
    claimed = {};
  }

  const result = await activatePartnerFlowContinuation({
    store: await resolveContinuationStore(payload),
    jti: payload?.jti ?? null,
    suiAddress: session.session.suiAddress,
    claimedPartnerId: claimed.partnerId,
    claimedPolicyId: claimed.policyId,
    claimedPolicyVersion: claimed.policyVersion,
    claimedReturnUrl: claimed.returnUrl,
  });

  if (!result.ok) {
    const status = result.code === "missing" ? 404 : 400;
    const res = NextResponse.json({ ok: false, code: result.code }, { status });
    if (result.code === "replay" || result.code === "expired" || result.code === "missing") {
      clearPartnerVerifyResumeCookie(res);
    }
    return res;
  }

  const binding = await signPartnerContinueBindingCookie({
    verifyRequestId: result.verifyRequestId,
    partnerId: result.partnerId,
    policyId: result.policyId,
    purpose: result.purpose,
    returnUrl: result.returnUrl,
  });

  const res = NextResponse.json({
    ok: true,
    continuePath: result.continuePath,
    issuedReceipt: false,
  });
  clearPartnerVerifyResumeCookie(res);
  if (binding) attachPartnerContinueBindingCookie(res, binding);
  return res;
}
