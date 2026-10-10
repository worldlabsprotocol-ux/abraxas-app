// FILE: app/api/v1/hosted-handoff/continue-context/route.ts
// Holder resolve for server-bound hosted handoffs (vr_*). Open/review does not consume.

import { NextRequest, NextResponse } from "next/server";
import {
  attachContinueContextTraceHeader,
  createContinueContextTraceCollector,
  isContinueContextTraceAuthorized,
} from "@/lib/partner/hostedHandoff/continueContextTrace";
import { resolveHostedHandoffForContinue } from "@/lib/partner/hostedHandoff/resolveForContinue";
import { resolvePartnerReturnUrlHintForRequest } from "@/lib/partner/partnerReturnUrlHint";
import { maybeAttachGoodTroublePartnerFlowBindingsFromReturnUrl } from "@/lib/partner/goodTroublePartnerFlowBindingAttach";
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
  const traceEnabled = isContinueContextTraceAuthorized(request);
  const trace = traceEnabled ? createContinueContextTraceCollector() : undefined;
  trace?.record("route_enter");

  const verifyRequest = request.nextUrl.searchParams.get("verify_request")?.trim() ?? "";
  if (!verifyRequest) {
    const res = NextResponse.json({ ok: false, code: "missing" }, { status: 400 });
    attachContinueContextTraceHeader(res.headers, trace);
    return res;
  }

  const queryReturnUrlHint = request.nextUrl.searchParams.get("return_url")?.trim() ?? null;
  const partnerReturnUrlHint = await resolvePartnerReturnUrlHintForRequest(
    request,
    queryReturnUrlHint,
    verifyRequest,
  );
  const resolved = await resolveHostedHandoffForContinue(verifyRequest, {
    trace,
    partnerReturnUrlHint: partnerReturnUrlHint || null,
  });
  if (!resolved.ok) {
    const res = NextResponse.json(
      { ok: false, code: resolved.code },
      { status: httpStatusForCode(resolved.code) },
    );
    attachContinueContextTraceHeader(res.headers, trace);
    return res;
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

  await maybeAttachGoodTroublePartnerFlowBindingsFromReturnUrl(
    res,
    preview.verify_request,
    preview.return_url,
  );

  attachContinueContextTraceHeader(res.headers, trace);
  return res;
}
