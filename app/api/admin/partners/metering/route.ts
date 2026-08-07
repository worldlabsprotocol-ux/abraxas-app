// FILE: app/api/admin/partners/metering/route.ts
// Admin-only partner metering aggregates.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import {
  buildPartnerMeteringReport,
  parsePartnerMeteringPagination,
  validatePartnerMeteringDateRange,
} from "@/lib/partner/partnerMeteringReport";
import { getPartnerEntitlements } from "@/lib/partner/partnerEntitlements";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim();
  if (!partnerId) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  const rangeResult = validatePartnerMeteringDateRange({
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });
  if (!rangeResult.ok) {
    return NextResponse.json({ error: rangeResult.error }, { status: 400 });
  }

  const { limit, offset } = parsePartnerMeteringPagination(req.nextUrl.searchParams);
  const [report, entitlements] = await Promise.all([
    buildPartnerMeteringReport({
      partnerId,
      range: rangeResult.range,
      limit,
      offset,
    }),
    getPartnerEntitlements(partnerId),
  ]);

  if (!report) {
    return NextResponse.json({ error: "Metering unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    partner_id: partnerId,
    metering: report,
    entitlements: {
      plan_id: entitlements.planId,
      enforcement_mode: entitlements.enforcementMode,
      monthly_receipt_limit: entitlements.monthlyReceiptLimit,
      monthly_api_call_limit: entitlements.monthlyApiCallLimit,
      observe_only: entitlements.enforcementMode !== "enforce",
      enforcement_label:
        entitlements.enforcementMode === "enforce"
          ? "Enforcement enabled — limits may block usage when configured."
          : "Observe-only — partners are not blocked or charged by default.",
    },
  });
}
