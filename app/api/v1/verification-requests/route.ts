// FILE: app/api/v1/verification-requests/route.ts
// Partner API: create eligibility verification request.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/verification/partnerAuth";
import { createVerificationRequest } from "@/lib/verification/requestsService";

export async function POST(req: NextRequest) {
  const auth = authenticatePartner(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    policy_id?: string;
    requested_action?: string;
    requested_claims?: string[];
    sui_address?: string;
    subject_session?: string;
  };

  if (!body.policy_id) {
    return NextResponse.json({ error: "policy_id required" }, { status: 400 });
  }

  try {
    const result = await createVerificationRequest({
      partnerId: auth.partnerId,
      policyId: body.policy_id,
      requestedAction: body.requested_action,
      requestedClaims: body.requested_claims,
      suiAddress: body.sui_address,
    });

    return NextResponse.json({
      ...result,
      policy_id: body.policy_id,
      partner_id: auth.partnerId,
      status: "pending",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
