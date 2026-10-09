// FILE: app/api/v1/partner-flow/purchase-return/route.ts
// Explicit holder return for L0 age-eligibility purchase — authoritative continuation only.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { completeAgeEligibilityPurchaseReturn } from "@/lib/partner/completeAgeEligibilityPurchaseReturn";
import { resolvePartnerReturnUrlHintForRequest } from "@/lib/partner/partnerReturnUrlHint";
import {
  buildPurchaseReturnDiagnostic,
  logGoodTroublePurchaseReturnDiagnostic,
} from "@/lib/partner/goodTroublePurchaseReturnDiagnostics";
import { GOOD_TROUBLE_GTV_BINDING_COOKIE } from "@/lib/partner/goodTroubleGtvBindingCookie";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/v1/partner-flow/purchase-return" as const;

export async function POST(request: NextRequest) {
  const started = Date.now();
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    recordPartnerFlowRequestOutcome({
      request,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      httpStatus: session.status,
    });
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const rateLimited = await enforcePartnerFlowRateLimit({
    request,
    endpoint: ENDPOINT,
    method: "POST",
    started,
    sessionSubject: session.session.suiAddress,
  });
  if (rateLimited) return rateLimited;

  let body: {
    verification_request_id?: string;
    receipt_id?: string;
    return_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verificationRequestId = body.verification_request_id?.trim();
  if (!verificationRequestId) {
    return NextResponse.json(
      { error: "verification_request_id is required", code: "missing" },
      { status: 400 },
    );
  }

  const clientReturnUrl = await resolvePartnerReturnUrlHintForRequest(
    request,
    body.return_url?.trim(),
    verificationRequestId,
  );

  logGoodTroublePurchaseReturnDiagnostic(buildPurchaseReturnDiagnostic({
    stage: "callback_received",
    code: "purchase_return_post",
    verifyRequestId: verificationRequestId,
    mergedHint: clientReturnUrl,
    bindingCookiePresent: Boolean(request.cookies.get(GOOD_TROUBLE_GTV_BINDING_COOKIE)?.value),
  }));

  const result = await completeAgeEligibilityPurchaseReturn({
    suiAddress: session.session.suiAddress,
    verificationRequestId,
    receiptId: body.receipt_id?.trim(),
    clientReturnUrl: clientReturnUrl || undefined,
  });

  if (!result.ok) {
    const status = result.code === "store_unavailable" ? 503
      : result.code === "missing_receipt" || result.code === "not_decided" ? 409
      : 400;
    recordPartnerFlowRequestOutcome({
      request,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      sessionSubject: session.session.suiAddress,
      httpStatus: status,
    });
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status },
    );
  }

  recordPartnerFlowRequestOutcome({
    request,
    endpoint: ENDPOINT,
    method: "POST",
    started,
    sessionSubject: session.session.suiAddress,
    httpStatus: 200,
  });

  return NextResponse.json({
    ok: true,
    redirect_url: result.redirect_url,
    receipt_id: result.receipt_id,
    decision_id: result.decision_id,
    replay: result.replay,
  });
}
