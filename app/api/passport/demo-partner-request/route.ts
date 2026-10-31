// FILE: app/api/passport/demo-partner-request/route.ts
// Pilot: create a test verification request for the signed-in holder (no partner key in browser).

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { isSandboxPolicyId, sandboxPartnerIdForPolicy, SANDBOX_POLICY_ID } from "@/lib/partner/sandboxPartner";
import { createVerificationRequest } from "@/lib/verification/requestsService";

const DEMO_POLICIES = [SANDBOX_POLICY_ID] as const;

export async function POST(req: NextRequest) {
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.error === "forbidden" ? 403 : 401 });
  }

  const body = await req.json().catch(() => ({})) as { policy_id?: string };
  const policyId = body.policy_id ?? SANDBOX_POLICY_ID;
  if (!DEMO_POLICIES.includes(policyId as typeof DEMO_POLICIES[number]) || !isSandboxPolicyId(policyId)) {
    return NextResponse.json({ error: "Only sandbox policies are available in this demo." }, { status: 400 });
  }
  const partnerId = sandboxPartnerIdForPolicy(policyId);
  try {
    const result = await createVerificationRequest({
      partnerId,
      policyId,
      requestedAction: "sandbox_eligibility_demo",
      holderSubjectId: session.subjectId,
    });
    return NextResponse.json({
      ...result,
      policy_id: policyId,
      partner_id: partnerId,
      sandbox_only: true,
    });
  } catch {
    return NextResponse.json({ error: "The sandbox request is unavailable right now." }, { status: 503 });
  }
}
