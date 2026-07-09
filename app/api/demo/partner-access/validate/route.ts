// FILE: app/api/demo/partner-access/validate/route.ts
// DEMO — server-side receipt validity check (no fake approval path).

import { NextRequest, NextResponse } from "next/server";
import { getPartnerAuthorizationStatus } from "@/lib/connect/authorizationService";
import { CONNECT_DEMO_PARTNER_ID } from "@/lib/connect/demoPartner";

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("authorization_request_id");
  if (!requestId) {
    return NextResponse.json({ error: "authorization_request_id required" }, { status: 400 });
  }

  const status = await getPartnerAuthorizationStatus(requestId, CONNECT_DEMO_PARTNER_ID);
  if (!status) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const unlocked =
    status.approved &&
    status.currently_valid === true &&
    status.validity === "active";

  return NextResponse.json({
    demo: true,
    ...status,
    action_unlocked: unlocked,
  });
}
