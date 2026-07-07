// FILE: app/api/v1/decisions/[id]/status/route.ts
// Re-check decision validity before settlement (revocation / expiry).

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/verification/partnerAuth";
import { getDecisionStatus } from "@/lib/verification/requestsService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticatePartner(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const decision = await getDecisionStatus(id);

  if (!decision) {
    return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  }

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
