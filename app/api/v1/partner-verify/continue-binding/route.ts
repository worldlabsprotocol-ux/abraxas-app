// FILE: app/api/v1/partner-verify/continue-binding/route.ts
// Return binding comes from the database continuation, not cookie fields.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import {
  CONTINUATION_STORE_UNAVAILABLE,
  ContinuationStoreUnavailableError,
} from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
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
  const pointer = token ? await verifyPartnerContinueBindingCookie(token) : null;
  if (!pointer || pointer.verifyRequestId !== verifyRequest) {
    const res = NextResponse.json({ ok: false, code: "invalid" }, { status: 400 });
    if (pointer && pointer.verifyRequestId !== verifyRequest) {
      clearPartnerContinueBindingCookie(res);
    }
    return res;
  }

  try {
    const stored = await createSupabaseContinuationStore().peekByVerifyRequestId(verifyRequest);
    if (!stored) {
      return NextResponse.json({ ok: false, code: "missing" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      partner_id: stored.partnerId,
      policy_id: stored.policyId,
      purpose: stored.purpose ?? null,
      return_url: stored.returnUrl,
    });
  } catch (error) {
    if (error instanceof ContinuationStoreUnavailableError) {
      return NextResponse.json({ ok: false, code: CONTINUATION_STORE_UNAVAILABLE }, { status: 503 });
    }
    return NextResponse.json({ ok: false, code: CONTINUATION_STORE_UNAVAILABLE }, { status: 503 });
  }
}
