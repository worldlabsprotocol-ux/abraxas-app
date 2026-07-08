// FILE: app/api/passport/demo-partner-request/route.ts
// Pilot: create a test verification request for the signed-in holder (no partner key in browser).

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { createVerificationRequest } from "@/lib/verification/requestsService";

const DEMO_POLICIES = ["abraxas-core-v1", "cielo-verified-guest-v1", "meridian-investor-gate-v1"] as const;

export async function POST(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await req.json().catch(() => ({})) as { policy_id?: string };
  const policyId = body.policy_id && DEMO_POLICIES.includes(body.policy_id as typeof DEMO_POLICIES[number])
    ? body.policy_id
    : "abraxas-core-v1";

  const partnerId = policyId === "meridian-investor-gate-v1"
    ? "meridian-private-credit"
    : "abraxas-pilot";

  try {
    const result = await createVerificationRequest({
      partnerId,
      policyId,
      requestedAction: policyId === "meridian-investor-gate-v1" ? "investor_onboarding" : "pilot_eligibility_check",
      suiAddress: session.session.suiAddress,
    });

    return NextResponse.json({
      ...result,
      policy_id: policyId,
      partner_id: partnerId,
      message: "Open consent_url to complete the portable reuse loop.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Could not create demo request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
