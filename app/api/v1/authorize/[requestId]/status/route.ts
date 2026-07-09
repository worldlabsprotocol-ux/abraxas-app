// FILE: app/api/v1/authorize/[requestId]/status/route.ts
// Partner polls authorization outcome + live receipt validity.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { getPartnerAuthorizationStatus } from "@/lib/connect/authorizationService";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { requestId } = await params;
  const status = await getPartnerAuthorizationStatus(requestId, auth.partnerId);

  if (!status) {
    return NextResponse.json({ error: "Authorization request not found" }, { status: 404 });
  }

  void logPartnerUsage({
    endpoint: "/api/v1/authorize/{requestId}/status",
    method: "GET",
    success: true,
    partner: auth.ctx,
    httpStatus: 200,
    responseTimeMs: Date.now() - started,
    recordId: requestId,
  });

  return NextResponse.json({
    artifact_type: "connect_authorization_status",
    ...status,
  });
}
