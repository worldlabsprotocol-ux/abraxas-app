// FILE: app/api/launchpad/public/settlement-config/route.ts
// Public Arc Testnet settlement config for hosted demo (no secrets).

import { NextRequest } from "next/server";
import { getLaunchpadApplicationBySlug } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { getArcSettlementConfig } from "@/lib/settlement/SettlementAuthorizationService";
import { ARC_ENVIRONMENTS } from "@/lib/settlement/constants";
import { settlementError, settlementJson } from "@/lib/settlement/settlementApiHelpers";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { resolveLaunchpadPolicyTemplate } from "@/lib/partner/launchpad/policyCatalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appSlug = req.nextUrl.searchParams.get("app");
  if (!appSlug) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 400);
  }

  const app = await getLaunchpadApplicationBySlug(appSlug);
  if (!app || app.status !== "active") {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 404);
  }

  const config = await getArcSettlementConfig(app.id);
  if (!config || !config.enabled || config.paused) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.config_disabled, 404);
  }

  const template = resolveLaunchpadPolicyTemplate(app.policy_template_id);
  const arc = ARC_ENVIRONMENTS.arc_testnet;

  return settlementJson({
    ok: true,
    testnet: true,
    network_label: "Arc Testnet TESTNET",
    application: {
      id: app.id,
      public_slug: app.public_slug,
      display_name: app.display_name,
      partner_id: app.partner_id,
      policy_id: app.policy_id,
      policy_template_label: template?.label ?? app.policy_template_id,
      user_explanation: template?.userExplanation ?? "Complete Abraxas verification before settlement.",
    },
    settlement: {
      chain_id: config.chain_id,
      contract_address: config.settlement_contract_address,
      usdc_token_address: config.usdc_token_address,
      approved_recipient: config.approved_recipient,
      minimum_amount_micro_usdc: config.minimum_amount_micro_usdc,
      maximum_amount_micro_usdc: config.maximum_amount_micro_usdc,
      authorization_lifetime_seconds: config.authorization_lifetime_seconds,
      explorer_url: arc.explorerUrl,
      rpc_url: arc.rpcUrl,
    },
    disclosure: {
      proves: "You completed the required Abraxas eligibility proof for this partner policy.",
      shared: "Wallet address, settlement amount, recipient, and a receipt commitment hash.",
      not_shared: "Legal name, birth date, email, documents, OAuth subject, or raw receipt contents.",
      funds_notice: "Arc Testnet USDC has no real value.",
    },
  });
}
