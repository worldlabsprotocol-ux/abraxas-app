// FILE: app/api/v1/partner-flow/purchase-return/route.ts
// Explicit holder return for L0 age-eligibility purchase — authoritative continuation only.

import { NextRequest, NextResponse } from "next/server";
import { requirePartnerFlowHolder } from "@/lib/partner/partnerFlowHolderContext";
import { completeAgeEligibilityPurchaseReturn } from "@/lib/partner/completeAgeEligibilityPurchaseReturn";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

export const dynamic = "force-dynamic";

const ENDPOINT = "/api/v1/partner-flow/purchase-return" as const;

export async function POST(request: NextRequest) {
  const started = Date.now();
  const holderAuth = await requirePartnerFlowHolder(request);
  if (!holderAuth.ok) {
    recordPartnerFlowRequestOutcome({
      request,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      httpStatus: holderAuth.status,
    });
    return NextResponse.json(
      { error: holderAuth.error, code: holderAuth.code },
      { status: holderAuth.status },
    );
  }
  const sessionSubject = holderAuth.holder.subjectId;

  const rateLimited = await enforcePartnerFlowRateLimit({
    request,
    endpoint: ENDPOINT,
    method: "POST",
    started,
    sessionSubject,
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

  const result = await completeAgeEligibilityPurchaseReturn({
    suiAddress: sessionSubject,
    verificationRequestId,
    receiptId: body.receipt_id?.trim(),
    clientReturnUrl: body.return_url?.trim(),
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
      sessionSubject,
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
    sessionSubject,
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
