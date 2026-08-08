// FILE: app/api/receipts/[receiptId]/public/route.ts
// Public-safe eligibility decision receipt — no PII, signature verification included.

import { NextRequest, NextResponse } from "next/server";
import { getPublicReceipt } from "@/lib/decisionReceipts/service";
import { publicReceiptLiveTrustHasNoPii } from "@/lib/decisionReceipts/publicReceiptLiveTrust";
import { assertNoPiiInPublicView } from "@/lib/decisionReceipts/views";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

const ENDPOINT = "/api/receipts/public" as const;

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
  const view = await getPublicReceipt(receiptId);

  if (!view) {
    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "GET",
      started,
      httpStatus: 404,
    });
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  assertNoPiiInPublicView(view);
  if (!publicReceiptLiveTrustHasNoPii(view)) {
    throw new Error("Public receipt live trust view must not contain PII");
  }

  recordPartnerFlowRequestOutcome({
    request: req,
    endpoint: ENDPOINT,
    method: "GET",
    started,
    httpStatus: 200,
  });

  return NextResponse.json(view, {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
