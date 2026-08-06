// FILE: app/api/v1/verification-requests/[id]/consent/route.ts
// Holder consents via browser session; policy engine returns decision.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import { consentAndDecide } from "@/lib/verification/requestsService";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

const ENDPOINT = "/api/v1/verification-requests/consent" as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const started = Date.now();
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      httpStatus: session.status,
    });
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const rateLimited = enforcePartnerFlowRateLimit({
    request: req,
    endpoint: ENDPOINT,
    method: "POST",
    started,
    sessionSubject: session.session.suiAddress,
  });
  if (rateLimited) return rateLimited;

  const { id } = await params;

  try {
    const result = await consentAndDecide({
      requestId: id,
      suiAddress: session.session.suiAddress,
    });

    const appOrigin = getPublicAppOriginFromRequest(req);

    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      sessionSubject: session.session.suiAddress,
      httpStatus: 200,
    });

    return NextResponse.json({
      decision: result.decision,
      claims: result.claims,
      valid_until: result.valid_until,
      decision_reference: result.decision_id,
      receipt_id: result.receipt_id,
      receipt_public_url: result.receipt_id
        ? `${appOrigin}/api/receipts/${result.receipt_id}/public`
        : null,
      reason_codes: result.reason_codes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Consent failed";
    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      sessionSubject: session.session.suiAddress,
      httpStatus: 400,
    });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
