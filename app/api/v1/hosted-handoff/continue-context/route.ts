// FILE: app/api/v1/hosted-handoff/continue-context/route.ts
// Holder resolve for server-bound hosted handoffs (vr_*). Open/review does not consume.

import { NextRequest, NextResponse } from "next/server";
import { resolveHostedHandoffForContinue } from "@/lib/partner/hostedHandoff/resolveForContinue";
import {
  attachPartnerContinueBindingCookie,
  signPartnerContinueBindingCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";

export const dynamic = "force-dynamic";

function httpStatusForCode(code: string): number {
  if (code === "expired") return 410;
  if (code === "completed" || code === "cancelled") return 409;
  if (code === "unavailable") return 503;
  return 404;
}

export async function GET(request: NextRequest) {
  const verifyRequest = request.nextUrl.searchParams.get("verify_request")?.trim() ?? "";
  if (!verifyRequest) {
    return NextResponse.json({ ok: false, code: "missing" }, { status: 400 });
  }

  const resolved = await resolveHostedHandoffForContinue(verifyRequest);
  if (!resolved.ok) {
    return NextResponse.json(
      { ok: false, code: resolved.code },
      { status: httpStatusForCode(resolved.code) },
    );
  }

  const { preview } = resolved;
  const res = NextResponse.json({
    ok: true,
    verify_request: preview.verify_request,
    partner_id: preview.partner_id,
    policy_id: preview.policy_id,
    policy_version: preview.policy_version,
    purpose: preview.purpose,
    application_id: preview.application_id,
    display_label: preview.display_label,
    environment: preview.environment,
    action: preview.action,
    result_family: preview.result_family,
    expires_at: preview.expires_at,
    return_url: preview.return_url,
    callback_bound: true,
  });

  const bindingToken = await signPartnerContinueBindingCookie({
    verifyRequestId: preview.verify_request,
  });
  if (bindingToken) {
    attachPartnerContinueBindingCookie(res, bindingToken);
  }

  return res;
}
