// FILE: app/api/admin/receipts/route.ts
// Admin list of decision receipts.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { listReceiptsForAdmin } from "@/lib/decisionReceipts/service";
import { toPublicView } from "@/lib/decisionReceipts/views";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const records = await listReceiptsForAdmin(Math.min(limit, 200));

  return NextResponse.json({
    receipts: records.map(r => ({
      ...toPublicView(r),
      decision_id: r.verification_decision_id,
      consent_receipt_id: r.consent_receipt_id,
      revoked_at: r.revoked_at,
      created_at: r.created_at,
    })),
  });
}
