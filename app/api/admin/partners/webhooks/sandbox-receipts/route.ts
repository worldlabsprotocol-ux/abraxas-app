// FILE: app/api/admin/partners/webhooks/sandbox-receipts/route.ts
// Read-only Production-sensitive sandbox webhook test receipt metadata.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { listSandboxTestReceiptsForPartner } from "@/lib/partner/webhooks/webhookSandboxTestReceiver";
import { validateObservabilityPartnerId } from "@/lib/partner/webhooks/webhookOperatorObservability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerValidation = validateObservabilityPartnerId(
    req.nextUrl.searchParams.get("partner_id") ?? "",
  );
  if (!partnerValidation.ok) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  const receipts = await listSandboxTestReceiptsForPartner(partnerValidation.value);
  if (!receipts) {
    return NextResponse.json({ error: "Receipts unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, receipts });
}
