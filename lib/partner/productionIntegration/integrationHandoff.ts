// FILE: lib/partner/productionIntegration/integrationHandoff.ts
// Operator handoff artifact for external relying partners.

import { SITE_URL } from "@/lib/siteUrl";
import { resolveLaunchpadPolicyTemplate } from "@/lib/partner/launchpad/policyCatalog";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/load";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  PRODUCTION_INTEGRATION_CONTRACT_VERSION,
  PRODUCTION_INTEGRATION_CORE_PATH_NOTE,
} from "./contract";
import { evaluateProductionIntegrationReadiness } from "./productionReadiness";

export interface IntegrationHandoffView {
  contract_version: typeof PRODUCTION_INTEGRATION_CONTRACT_VERSION;
  application_id: string;
  public_slug: string;
  partner_id: string;
  environment: string;
  policy_id: string;
  policy_version: number;
  policy_template_id: string;
  policy_label: string;
  hosted_flow_pattern: string;
  hosted_handoff_pattern: string;
  approved_callback_class: "localhost_sandbox" | "https_production" | "missing";
  server_verification_pattern: string;
  starter_kit_path: string;
  production_readiness: Awaited<ReturnType<typeof evaluateProductionIntegrationReadiness>>;
  outstanding_blockers: string[];
  privacy_boundary: string;
  optional_layers_note: typeof PRODUCTION_INTEGRATION_CORE_PATH_NOTE;
  verify_recommended_api: "AbraxasPartnerKit.verifyForAction";
}

export async function buildIntegrationHandoff(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  productionKeyRevoked?: boolean;
  webhookRequired?: boolean;
}): Promise<IntegrationHandoffView> {
  const app = input.application;
  const evidence = await loadGoLiveEvidence({ application: app, partnerId: input.partnerId });
  const readiness = await evaluateProductionIntegrationReadiness({
    application: app,
    evidence,
    productionKeyRevoked: input.productionKeyRevoked,
    webhookRequired: input.webhookRequired,
    selectedCapabilities: evidence.webhookConfigured ? ["webhooks"] : [],
  });

  let callbackClass: IntegrationHandoffView["approved_callback_class"] = "missing";
  const hasHttps = evidence.allowedReturnUrls.some((url) => url.startsWith("https://"));
  const hasLocal = evidence.allowedReturnUrls.some((url) => url.includes("localhost"));
  if (hasHttps) callbackClass = "https_production";
  else if (hasLocal) callbackClass = "localhost_sandbox";

  const template = resolveLaunchpadPolicyTemplate(app.policy_template_id);
  const base = SITE_URL.replace(/\/$/, "");

  return {
    contract_version: PRODUCTION_INTEGRATION_CONTRACT_VERSION,
    application_id: app.id,
    public_slug: app.public_slug,
    partner_id: app.partner_id,
    environment: app.environment,
    policy_id: app.policy_id,
    policy_version: app.policy_version,
    policy_template_id: app.policy_template_id,
    policy_label: template?.label ?? app.policy_template_id,
    hosted_flow_pattern: `${base}/partner/verify?app=${encodeURIComponent(app.public_slug)}&return_url=<allowlisted_callback>`,
    hosted_handoff_pattern: `POST ${base}/api/v1/partner-handoff (server-only; returns verify_request holder URL)`,
    approved_callback_class: callbackClass,
    server_verification_pattern: `GET ${base}/api/receipts/{receipt_id}/public then AbraxasPartnerKit.verifyForAction`,
    starter_kit_path: "/developers/integration-studio",
    production_readiness: readiness,
    outstanding_blockers: readiness.blockers,
    privacy_boundary: "Partners receive signed eligibility receipts only. No DOB, documents, or raw evidence.",
    optional_layers_note: PRODUCTION_INTEGRATION_CORE_PATH_NOTE,
    verify_recommended_api: "AbraxasPartnerKit.verifyForAction",
  };
}

export function integrationHandoffLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  if (/abx_live_[a-z0-9_-]{12,}/.test(blob)) leaks.push("raw_live_key");
  if (/allowed_return_urls/.test(blob)) leaks.push("callback_urls");
  if (/date_of_birth|legal_name|wallet_address/.test(blob)) leaks.push("pii");
  return leaks;
}
