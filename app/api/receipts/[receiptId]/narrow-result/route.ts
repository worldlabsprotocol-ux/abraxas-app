// FILE: app/api/receipts/[receiptId]/narrow-result/route.ts
// Public narrow partner result — authorized policy facts only, no raw claims or artifact identifiers.

import { NextRequest, NextResponse } from "next/server";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

const ENDPOINT = "/api/receipts/narrow-result" as const;

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

  try {
    const result = await buildNarrowPartnerResultForReceipt(receiptId);
    if (!result) {
      recordPartnerFlowRequestOutcome({
        request: req,
        endpoint: ENDPOINT,
        method: "GET",
        started,
        httpStatus: 404,
      });
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "GET",
      started,
      httpStatus: 200,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "GET",
      started,
      httpStatus: 503,
    });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
