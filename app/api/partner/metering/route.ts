// FILE: app/api/partner/metering/route.ts
// Partner-authenticated read-only usage aggregates — own partner only.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import {
  buildPartnerMeteringReport,
  parsePartnerMeteringPagination,
  validatePartnerMeteringDateRange,
} from "@/lib/partner/partnerMeteringReport";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticatePartner(req, "metering:read");
  if (!auth) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rangeResult = validatePartnerMeteringDateRange({
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to"),
  });
  if (!rangeResult.ok) {
    return NextResponse.json({ error: rangeResult.error }, { status: 400 });
  }

  const { limit, offset } = parsePartnerMeteringPagination(req.nextUrl.searchParams);
  const report = await buildPartnerMeteringReport({
    partnerId: auth.ctx.partnerId,
    range: rangeResult.range,
    limit,
    offset,
  });

  if (!report) {
    return NextResponse.json({ error: "Metering unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    metering: report,
    note: "Observe-only mode — usage is recorded for planning; partners are not blocked or charged.",
  });
}
