// FILE: app/api/stocklana/eligibility/route.ts
// Validate Abraxas eligibility receipt for Stocklana — server-side, no PII.

import { NextRequest, NextResponse } from "next/server";
import { getPublicReceipt } from "@/lib/decisionReceipts/service";
import { publicReceiptLiveTrustHasNoPii } from "@/lib/decisionReceipts/publicReceiptLiveTrust";
import { assertNoPiiInPublicView } from "@/lib/decisionReceipts/views";
import {
  STOCKLANA_ELIGIBILITY_POLICY_ID,
  STOCKLANA_PARTNER_ID,
} from "@/lib/stocklana/constants";
import {
  assertReceiptResponseHasNoPii,
  resolveStocklanaEligibility,
} from "@/lib/stocklana/validateEligibilityReceipt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { receipt_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_json" }, { status: 400 });
  }

  const receiptId = body.receipt_id?.trim();
  if (!receiptId) {
    return NextResponse.json({ ok: false, code: "receipt_id_required" }, { status: 400 });
  }

  const view = await getPublicReceipt(receiptId);
  if (!view) {
    return NextResponse.json({ ok: false, code: "receipt_not_found", state: "error" }, { status: 404 });
  }

  assertNoPiiInPublicView(view);
  if (!publicReceiptLiveTrustHasNoPii(view)) {
    return NextResponse.json({ ok: false, code: "receipt_pii_guard_failed", state: "error" }, { status: 500 });
  }

  assertReceiptResponseHasNoPii(view as unknown as Record<string, unknown>);

  const resolution = resolveStocklanaEligibility(view, {
    partnerId: STOCKLANA_PARTNER_ID,
    policyId: STOCKLANA_ELIGIBILITY_POLICY_ID,
  });

  return NextResponse.json({
    ok: resolution.state !== "error",
    state: resolution.state,
    purchase_permitted: resolution.purchasePermitted,
    detail: resolution.detail,
    partner_receipt: resolution.partnerView,
    pii_disclosed: false,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
