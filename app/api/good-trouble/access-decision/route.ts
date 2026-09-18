// FILE: app/api/good-trouble/access-decision/route.ts
// Reference partner server gate. Callback params are not authorization.

import { NextRequest, NextResponse } from "next/server";
import { decideGoodTroubleAccess } from "@/lib/goodTrouble/accessDecision";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const result = await decideGoodTroubleAccess(req.nextUrl.searchParams);
  const status = result.grant ? 200 : result.outcome === "retry" ? 503 : 403;
  return NextResponse.json({
    grant: result.grant,
    outcome: result.outcome,
    action: result.action,
    errors: result.errors,
    receipt_id: result.receipt_id,
    callback_trusted: false,
  }, { status });
}
