// FILE: app/api/receipts/[receiptId]/portable-verification/route.ts
// Partner Flow → portable independent verification bundle (SIAS + signed status + pinned anchor).

import { NextRequest, NextResponse } from "next/server";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { buildPortableVerificationBundle } from "@/lib/partner/portableIndependentVerification";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

const ENDPOINT = "/api/receipts/portable-verification" as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const started = Date.now();
  const rateLimited = await enforcePartnerFlowRateLimit({
    request: req,
    endpoint: ENDPOINT,
    method: "GET",
    started,
  });
  if (rateLimited) return rateLimited;

  const { receiptId } = await params;
  const record = await getReceiptById(receiptId);
  if (!record) {
    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "GET",
      started,
      httpStatus: 404,
    });
    return NextResponse.json({ ok: false, error: "receipt_not_found" }, { status: 404 });
  }

  const built = await buildPortableVerificationBundle({ record });
  if (!built.ok) {
    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "GET",
      started,
      httpStatus: 503,
    });
    return NextResponse.json(
      { ok: false, error: built.reason, gaps: built.gaps ?? [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  recordPartnerFlowRequestOutcome({
    request: req,
    endpoint: ENDPOINT,
    method: "GET",
    started,
    httpStatus: 200,
  });

  return NextResponse.json(
    { ok: true, bundle: built.bundle },
    {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
