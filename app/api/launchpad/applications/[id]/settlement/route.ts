// FILE: app/api/launchpad/applications/[id]/settlement/route.ts

import { NextRequest } from "next/server";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import {
  getArcSettlementConfig,
  upsertArcSettlementConfig,
} from "@/lib/settlement/SettlementAuthorizationService";
import {
  requireSettlementPartnerAuth,
  settlementError,
  settlementJson,
} from "@/lib/settlement/settlementApiHelpers";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { buildArcSettlementIntegrationDocs } from "@/lib/settlement/integrationDocs";
import { normalizeEvmAddress } from "@/lib/settlement/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireSettlementPartnerAuth(req, params.id);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.partnerId);
  if (!app) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 404);
  }

  const config = await getArcSettlementConfig(params.id);
  const docs = config ? buildArcSettlementIntegrationDocs(app, config) : null;

  return settlementJson({
    ok: true,
    config,
    integration: docs,
    production_arc_available: false,
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireSettlementPartnerAuth(req, params.id);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.partnerId);
  if (!app) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400, "Invalid JSON");
  }

  const recipient = typeof body.approved_recipient === "string"
    ? normalizeEvmAddress(body.approved_recipient)
    : null;
  if (!recipient) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.recipient_not_allowed, 400);
  }

  const config = await upsertArcSettlementConfig(params.id, auth.partnerId, {
    enabled: body.enabled === true,
    approved_recipient: recipient,
    minimum_amount_micro_usdc: Number(body.minimum_amount_micro_usdc ?? 10000),
    maximum_amount_micro_usdc: Number(body.maximum_amount_micro_usdc ?? 100000000),
    policy_id: app.policy_id,
    policy_version: app.policy_version,
    authorization_lifetime_seconds: Number(body.authorization_lifetime_seconds ?? 900),
    reusable_authorization: body.reusable_authorization === true,
    paused: body.paused === true,
    settlement_contract_address:
      typeof body.settlement_contract_address === "string"
        ? body.settlement_contract_address
        : process.env.ARC_TESTNET_SETTLEMENT_CONTRACT_ADDRESS ?? null,
    usdc_token_address: "0x3600000000000000000000000000000000000000",
  });

  const docs = buildArcSettlementIntegrationDocs(app, config);
  return settlementJson({ ok: true, config, integration: docs });
}
