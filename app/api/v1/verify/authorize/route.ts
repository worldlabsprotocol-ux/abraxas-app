// FILE: app/api/v1/verify/authorize/route.ts
// Abraxas Verify — permission-based trust request authorization.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";
import { createVerifyAuthorization } from "@/lib/verify/authorize";
import { PermissionResolutionError } from "@/lib/verify/resolvePermission";

export async function POST(req: NextRequest) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    permission?: string;
    permission_version?: string;
    redirect_uri?: string;
    return_url?: string;
    state?: string;
  };

  const permission = body.permission?.trim();
  const redirectUri = (body.redirect_uri ?? body.return_url)?.trim();
  if (!permission || !redirectUri) {
    return NextResponse.json(
      { error: "permission and redirect_uri are required" },
      { status: 400 },
    );
  }

  try {
    const result = await createVerifyAuthorization({
      relyingPartyId: auth.partnerId,
      permission,
      permissionVersion: body.permission_version,
      redirectUri,
      state: body.state,
    });

    void logPartnerUsage({
      endpoint: "/api/v1/verify/authorize",
      method: "POST",
      success: true,
      partner: auth.ctx,
      httpStatus: 200,
      responseTimeMs: Date.now() - started,
      policyId: result.policy_id,
      recordId: result.trust_request_id,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Authorize failed";
    const status = e instanceof PermissionResolutionError
      ? (e.code === "not_allowed" ? 403 : 400)
      : msg.includes("allowlisted") ? 400 : 400;

    void logPartnerUsage({
      endpoint: "/api/v1/verify/authorize",
      method: "POST",
      success: false,
      partner: auth.ctx,
      httpStatus: status,
      responseTimeMs: Date.now() - started,
    });

    return NextResponse.json({ error: msg }, { status });
  }
}
