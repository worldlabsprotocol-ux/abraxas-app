// FILE: app/api/launchpad/public/settlement/confirm/route.ts
// Browser session settlement confirmation after independent onchain verification.

import { NextRequest } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getLaunchpadApplicationBySlug } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import {
  getArcSettlementConfig,
  getSettlementAuthorizationStatus,
} from "@/lib/settlement/SettlementAuthorizationService";
import { confirmSettlementFromChain } from "@/lib/settlement/confirmSettlement.server";
import { settlementError, settlementJson } from "@/lib/settlement/settlementApiHelpers";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { checkSettlementRateLimit } from "@/lib/settlement/settlementRateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rateLimited = checkSettlementRateLimit(req, "/api/launchpad/public/settlement/confirm", 30);
  if (!rateLimited.allowed) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.rate_limited, 429);
  }

  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.unauthorized, session.status);
  }

  let body: { app?: string; authorization_id?: string; transaction_hash?: string };
  try {
    body = await req.json();
  } catch {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400);
  }

  if (!body.app || !body.authorization_id || !body.transaction_hash) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400);
  }

  const app = await getLaunchpadApplicationBySlug(body.app);
  if (!app || app.status !== "active") {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 404);
  }

  const authorization = await getSettlementAuthorizationStatus(app.id, app.partner_id, body.authorization_id);
  if (!authorization) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_not_found, 404);
  }

  const config = await getArcSettlementConfig(app.id);
  if (!config) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.config_not_found, 404);
  }

  const result = await confirmSettlementFromChain({
    applicationId: app.id,
    partnerId: app.partner_id,
    authorizationId: body.authorization_id,
    transactionHash: body.transaction_hash,
    config,
    authorization,
  });

  if (!result.ok) {
    const status = result.code === SETTLEMENT_PUBLIC_ERRORS.duplicate_confirmation ? 409 : 400;
    return settlementError(result.code, status);
  }

  return settlementJson({ ok: true, status: "confirmed", testnet: true });
}
