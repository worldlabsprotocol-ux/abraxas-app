// FILE: app/api/v1/decisions/[id]/status/route.ts
// Re-check decision validity before settlement (revocation / expiry).

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { getDecisionStatus } from "@/lib/verification/requestsService";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

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
  const decision = await getDecisionStatus(id);

  if (!decision) {
    void logPartnerUsage({
      endpoint: "/api/v1/decisions/{id}/status",
      method: "GET",
      success: false,
      partner: auth.ctx,
      httpStatus: 404,
      responseTimeMs: Date.now() - started,
      recordId: id,
    });
    return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  }

  void logPartnerUsage({
    endpoint: "/api/v1/decisions/{id}/status",
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

  return NextResponse.json({
    decision_id: decision.id,
    decision: decision.decision,
    status: decision.status,
    claims: decision.claims_json,
    valid_until: decision.valid_until,
    reason_codes: decision.reason_codes,
    decided_at: decision.decided_at,
    policy_id: decision.policy_id,
    policy_version: decision.policy_version,
  });
}
