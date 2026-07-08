// FILE: app/api/v1/verification-requests/route.ts
// Partner API: create eligibility verification request.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { createVerificationRequest } from "@/lib/verification/requestsService";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    policy_id?: string;
    requested_action?: string;
    requested_claims?: string[];
    sui_address?: string;
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

    void logPartnerUsage({
      endpoint: "/api/v1/verification-requests",
      method: "POST",
      success: true,
      partner: auth.ctx,
      httpStatus: 200,
      responseTimeMs: Date.now() - started,
      policyId: body.policy_id,
      recordType: "verification_request",
      recordId: result.request_id,
    });

    return NextResponse.json({
      ...result,
      policy_id: body.policy_id,
      partner_id: auth.partnerId,
      status: "pending",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create request";
    void logPartnerUsage({
      endpoint: "/api/v1/verification-requests",
      method: "POST",
      success: false,
      partner: auth.ctx,
      httpStatus: 400,
      responseTimeMs: Date.now() - started,
      policyId: body.policy_id,
    });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
