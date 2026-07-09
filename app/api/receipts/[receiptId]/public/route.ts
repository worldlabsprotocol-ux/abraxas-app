// FILE: app/api/receipts/[receiptId]/public/route.ts
// Public-safe eligibility decision receipt — no PII, signature verification included.

import { NextRequest, NextResponse } from "next/server";
import { getPublicReceipt } from "@/lib/decisionReceipts/service";
import { assertNoPiiInPublicView } from "@/lib/decisionReceipts/views";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const { receiptId } = await params;
  const view = await getPublicReceipt(receiptId);

  if (!view) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  assertNoPiiInPublicView(view);

  return NextResponse.json(view, {
    headers: {
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
