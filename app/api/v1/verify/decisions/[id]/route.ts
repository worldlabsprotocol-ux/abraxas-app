// FILE: app/api/v1/verify/decisions/[id]/route.ts
// Abraxas Verify — Trust Decision retrieval (primary relying-party abstraction).

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";
import { getTrustDecisionForRelyingParty } from "@/lib/verify/getTrustDecision";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const decision = await getTrustDecisionForRelyingParty(id, auth.partnerId);

  if (!decision) {
    void logPartnerUsage({
      endpoint: "/api/v1/verify/decisions/{id}",
      method: "GET",
      success: false,
      partner: auth.ctx,
      httpStatus: 404,
      responseTimeMs: Date.now() - started,
      recordId: id,
    });
    return NextResponse.json({ error: "Trust decision not found" }, { status: 404 });
  }

  void logPartnerUsage({
    endpoint: "/api/v1/verify/decisions/{id}",
    method: "GET",
    success: true,
    partner: auth.ctx,
    httpStatus: 200,
    responseTimeMs: Date.now() - started,
    recordId: id,
    policyId: decision.policy_id,
    policyVersion: String(decision.policy_version),
    decision: decision.decision,
  });

  return NextResponse.json(decision);
}
