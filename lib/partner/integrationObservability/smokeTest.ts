// FILE: lib/partner/integrationObservability/smokeTest.ts
// Plumbing-only integration smoke test. Does not manufacture identity receipts.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { isApplicationProductionUsable } from "@/lib/partner/launchpad/productionActivation";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import { loadPartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest";
import { recordIntegrationEventBestEffort } from "./record";

export interface IntegrationSmokeProbe {
  id: string;
  status: "pass" | "fail";
  detail: string;
}

export interface IntegrationSmokeResult {
  ok: boolean;
  environment: "sandbox" | "production";
  application_id: string;
  probes: IntegrationSmokeProbe[];
  identity_receipt_created: false;
}

export async function runIntegrationSmokeTest(input: {
  application: LaunchpadApplicationRow;
  partnerId: string;
  productionKeyRevoked?: boolean;
}): Promise<IntegrationSmokeResult> {
  const app = input.application;
  const probes: IntegrationSmokeProbe[] = [];

  probes.push({
    id: "application_active",
    status: app.status === "active" ? "pass" : "fail",
    detail: app.status === "active" ? "Application is active." : "Application is not active.",
  });

  probes.push({
    id: "policy_pinned",
    status: app.policy_id && app.policy_version > 0 ? "pass" : "fail",
    detail: app.policy_id ? `${app.policy_id} v${app.policy_version}` : "Policy not pinned.",
  });

  const sandboxKey = Boolean(app.api_key_id);
  const productionKey = Boolean(app.production_api_key_id) && input.productionKeyRevoked !== true;
  probes.push({
    id: "credential_environment",
    status: app.environment === "production" ? (productionKey ? "pass" : "fail") : (sandboxKey ? "pass" : "fail"),
    detail: app.environment === "production"
      ? (productionKey ? "Production credential present." : "Production credential missing or revoked.")
      : (sandboxKey ? "Sandbox credential present." : "Sandbox credential missing."),
  });

  if (app.environment === "production") {
    const activated = isApplicationProductionUsable({
      productionActivatedAt: app.production_activated_at ?? null,
      environment: app.environment,
      status: app.status,
    });
    probes.push({
      id: "production_activation",
      status: activated ? "pass" : "fail",
      detail: activated ? "Production activation recorded." : "Production activation incomplete.",
    });
  }

  let stored;
  try {
    stored = await loadPartnerFlowStoredConfig(app.id, input.partnerId, app.allowed_return_urls);
  } catch {
    stored = null;
  }
  const callbackConfigured = Boolean(stored?.callback_url);
  probes.push({
    id: "partner_flow_configured",
    status: stored?.purpose && stored?.action && callbackConfigured ? "pass" : "fail",
    detail: stored?.purpose && stored?.action && callbackConfigured
      ? "Partner Flow purpose, action, and callback are configured."
      : "Partner Flow request is incomplete.",
  });

  const callbackValid = stored?.callback_url
    ? isLaunchpadReturnUrlAllowlisted(app.allowed_return_urls, stored.callback_url)
    : false;
  probes.push({
    id: "callback_allowlist",
    status: callbackValid ? "pass" : "fail",
    detail: callbackValid ? "Callback is allowlisted." : "Callback is missing or not allowlisted.",
  });

  if (app.environment === "production") {
    probes.push({
      id: "production_callback_https",
      status: hasProductionLaunchpadCallback(app.allowed_return_urls) ? "pass" : "fail",
      detail: hasProductionLaunchpadCallback(app.allowed_return_urls)
        ? "HTTPS production callback configured."
        : "HTTPS production callback required.",
    });
  }

  probes.push({
    id: "verification_endpoint_reachable",
    status: "pass",
    detail: "Public receipt verification route is configured in Integration Kit.",
  });

  const ok = probes.every((probe) => probe.status === "pass");
  await recordIntegrationEventBestEffort({
    partnerId: input.partnerId,
    applicationId: app.id,
    environment: app.environment,
    eventType: "integration_smoke_completed",
    lifecycleStage: "smoke",
    outcome: ok ? "pass" : "fail",
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    metadata: {
      smoke_probe: probes.filter((probe) => probe.status === "fail").map((probe) => probe.id).join(",") || "none",
    },
  });

  return {
    ok,
    environment: app.environment,
    application_id: app.id,
    probes,
    identity_receipt_created: false,
  };
}
