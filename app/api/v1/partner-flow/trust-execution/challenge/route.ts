// FILE: app/api/v1/partner-flow/trust-execution/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartnerScoped } from "@/lib/partner/partnerAuth";
import {
  getLaunchpadApplicationById,
  getLaunchpadApplicationForPartner,
} from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import { issuePartnerTrustExecutionChallenge } from "@/lib/partner/trustExecution/partnerTrustExecutionService";
import { ScopedChallengeStoreUnavailableError } from "@/lib/auth/walletAuthorization/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const applicationId = req.headers.get("x-abraxas-application-id")?.trim() ?? "";
  if (!applicationId) {
    return NextResponse.json({ ok: false, code: "app_required" }, { status: 400 });
  }

  let body: {
    holder_wallet_address?: string;
    solana_network?: string;
    correlation_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_input" }, { status: 400 });
  }

  const wallet = String(body.holder_wallet_address ?? "").trim();
  if (!wallet) {
    return NextResponse.json({ ok: false, code: "holder_wallet_required" }, { status: 400 });
  }

  const appPreview = await getLaunchpadApplicationById(applicationId);
  if (!appPreview) {
    return NextResponse.json({ ok: false, code: "application_not_found" }, { status: 404 });
  }

  const auth = await authenticatePartnerScoped(req, "verify:requests", {
    requiredApplicationId: applicationId,
    knownApplicationPartnerId: appPreview.partner_id,
    requiredCredentialEnvironment: appPreview.environment === "production" ? "production" : "sandbox",
    requireProductionActive: appPreview.environment === "production",
  });
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: "unauthorized" }, { status: auth.status });
  }

  const app = await getLaunchpadApplicationForPartner(applicationId, auth.ctx.partnerId);
  if (!app) {
    return NextResponse.json({ ok: false, code: "application_not_found" }, { status: 404 });
  }

  const origin = getPublicAppOriginFromRequest(req);
  try {
    const issued = await issuePartnerTrustExecutionChallenge({
      partnerId: auth.ctx.partnerId,
      applicationId,
      holderWalletAddress: wallet,
      origin,
      uri: `${origin}${req.nextUrl.pathname}`,
      solanaNetwork: String(body.solana_network ?? "devnet"),
      correlationId: body.correlation_id,
    });
    if (!issued.ok) {
      const status = issued.code === "application_scope_invalid" ? 403 : 400;
      return NextResponse.json({ ok: false, code: issued.code }, { status });
    }
    return NextResponse.json({
      ok: true,
      challenge_id: issued.challenge_id,
      correlation_id: issued.correlation_id,
      expires_at: issued.expires_at,
      action: issued.action,
      policy_id: issued.policy_id,
      policy_version: issued.policy_version,
    });
  } catch (error) {
    if (error instanceof ScopedChallengeStoreUnavailableError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 503 });
    }
    throw error;
  }
}
