// FILE: app/api/v1/receipts/[receiptId]/route.ts
// Partner-authenticated policy evaluation receipt — consent scope enforced.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { getPartnerReceipt } from "@/lib/decisionReceipts/service";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { receiptId } = await params;
  const result = await getPartnerReceipt(receiptId, auth.partnerId);

  if (!result) {
    void logPartnerUsage({
      endpoint: "/api/v1/receipts/{receiptId}",
      method: "GET",
      success: false,
      partner: auth.ctx,
      httpStatus: 404,
      responseTimeMs: Date.now() - started,
      recordId: receiptId,
    });
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  if ("error" in result && result.error === "forbidden") {
    void logPartnerUsage({
      endpoint: "/api/v1/receipts/{receiptId}",
      method: "GET",
      success: false,
      partner: auth.ctx,
      httpStatus: 403,
      responseTimeMs: Date.now() - started,
      recordId: receiptId,
    });
    return NextResponse.json({ error: "Receipt not accessible for this partner" }, { status: 403 });
  }

  void logPartnerUsage({
    endpoint: "/api/v1/receipts/{receiptId}",
    method: "GET",
    success: true,
    partner: auth.ctx,
    httpStatus: 200,
    responseTimeMs: Date.now() - started,
    recordId: receiptId,
    policyId: result.view.policy_id,
    policyVersion: String(result.view.policy_version),
    decision: result.view.decision_result,
  });

  return NextResponse.json({
    artifact_type: "policy_evaluation_receipt",
    receipt: result.view,
    currently_valid: result.valid,
    status: result.status,
  });
}
