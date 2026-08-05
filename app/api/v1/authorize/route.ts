// FILE: app/api/v1/authorize/route.ts
// Create Connect authorization request — NEVER returns approval without user consent.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { createAuthorizationRequest } from "@/lib/connect/authorizationService";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    policy_id?: string;
    wallet_address?: string;
    chain?: "evm" | "sui";
    chain_id?: number;
    requested_action?: string;
    return_url?: string;
    idempotency_key?: string;
  };

  if (!body.policy_id || !body.return_url) {
    return NextResponse.json({ error: "policy_id and return_url required" }, { status: 400 });
  }

  try {
    const result = await createAuthorizationRequest({
      partnerId: auth.partnerId,
      policyId: body.policy_id,
      walletAddress: body.wallet_address,
      chain: body.chain ?? "evm",
      chainId: body.chain_id,
      requestedAction: body.requested_action,
      returnUrl: body.return_url,
      idempotencyKey: body.idempotency_key,
      appOrigin: getPublicAppOriginFromRequest(req),
    });

    void logPartnerUsage({
      endpoint: "/api/v1/authorize",
      method: "POST",
      success: true,
      partner: auth.ctx,
      httpStatus: 200,
      responseTimeMs: Date.now() - started,
      policyId: body.policy_id,
      recordId: result.authorization_request_id,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Authorize failed";
    void logPartnerUsage({
      endpoint: "/api/v1/authorize",
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
