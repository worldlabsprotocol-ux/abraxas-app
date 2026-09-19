// FILE: app/api/v1/partner-verify/continue-binding/route.ts
// Tenant-scoped return binding for /partner/continue — never trusts URL callback params.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import {
  clearPartnerContinueBindingCookie,
  PARTNER_CONTINUE_BINDING_COOKIE,
  verifyPartnerContinueBindingCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const verifyRequest = request.nextUrl.searchParams.get("verify_request")?.trim() ?? "";
  if (!verifyRequest) {
    return NextResponse.json({ ok: false, code: "missing" }, { status: 400 });
  }

  const token = request.cookies.get(PARTNER_CONTINUE_BINDING_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, code: "missing" }, { status: 404 });
  }

  const payload = await verifyPartnerContinueBindingCookie(token);
  if (!payload || payload.verifyRequestId !== verifyRequest) {
    const res = NextResponse.json({ ok: false, code: "invalid" }, { status: 400 });
    if (payload && payload.verifyRequestId !== verifyRequest) {
      clearPartnerContinueBindingCookie(res);
    }
    return res;
  }

  return NextResponse.json({
    ok: true,
    partner_id: payload.partnerId,
    policy_id: payload.policyId,
    purpose: payload.purpose ?? null,
    return_url: payload.returnUrl,
  });
}
