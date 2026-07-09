// FILE: app/api/admin/connect/authorization-requests/[requestId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { getAuthorizationRequest } from "@/lib/connect/authorizationService";
import { getPartnerAuthorizationStatus } from "@/lib/connect/authorizationService";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const row = await getAuthorizationRequest(requestId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const partnerView = await getPartnerAuthorizationStatus(requestId, row.partner_id);
  let receiptDetail = null;
  if (row.receipt_id) {
    const receipt = await getReceiptById(row.receipt_id);
    if (receipt) {
      receiptDetail = {
        receipt_id: receipt.id,
        validity: await resolveReceiptValidity(receipt, { partnerId: row.partner_id, policyId: row.policy_id }),
      };
    }
  }

  return NextResponse.json({
    authorization: row,
    partner_status: partnerView,
    receipt: receiptDetail,
  });
}
