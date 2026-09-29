// FILE: lib/partner/productionIntegration/productionReadiness.ts
// Machine-readable production readiness for external relying partners.

import { buildGoLiveReadinessView, type GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import { loadPartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/store";
import { productionCredentialState } from "@/lib/partner/launchpad/productionCredentials/evaluate";
import { hasProductionLaunchpadCallback } from "@/lib/partner/launchpad/productionCallbackReadiness";
import { isVerifiedDomainForCallbacks } from "@/lib/partner/launchpad/domainVerification";
import { isApplicationProductionUsable } from "@/lib/partner/launchpad/productionActivation";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { ProductionIntegrationBlocker } from "./contract";
import { validateRegisteredCallback } from "./callbackSecurity";

export interface ProductionReadinessInput {
  application: LaunchpadApplicationRow;
  evidence: GoLiveEvidence;
  productionKeyRevoked?: boolean;
  schemaReady?: boolean;
  webhookRequired?: boolean;
  selectedCapabilities?: readonly string[];
}

export interface ProductionReadinessAssessment {
  ok: boolean;
  application_id: string;
  environment: string;
  lifecycle: string;
  blockers: ProductionIntegrationBlocker[];
  checks: Array<{ id: string; status: "pass" | "fail" | "not_applicable"; detail: string }>;
  optional_layers_required: string[];
  core_path_only: true;
}

function mapBlocker(code: string): ProductionIntegrationBlocker | null {
  const table: Record<string, ProductionIntegrationBlocker> = {
    production_access_not_approved: "production_access_not_approved",
    production_credential_inactive: "production_credential_inactive",
    production_credential_revoked: "production_credential_revoked",
    production_callback_missing: "production_callback_missing",
    production_callback_not_https: "production_callback_not_https",
    production_callback_domain_unverified: "production_callback_domain_unverified",
    sandbox_only_policy: "sandbox_only_policy",
    policy_not_pinned: "policy_not_pinned",
    partner_flow_not_configured: "partner_flow_not_configured",
    webhook_required_but_unconfigured: "webhook_required_but_unconfigured",
  };
  return table[code] ?? null;
}

export async function evaluateProductionIntegrationReadiness(
  input: ProductionReadinessInput,
): Promise<ProductionReadinessAssessment> {
  const blockers: ProductionIntegrationBlocker[] = [];
  const checks: ProductionReadinessAssessment["checks"] = [];
  const app = input.application;
  const evidence = input.evidence;
  const goLive = buildGoLiveReadinessView(evidence, input.selectedCapabilities);

  const activated = isApplicationProductionUsable({
    productionActivatedAt: app.production_activated_at ?? null,
    environment: app.environment,
    status: app.status,
  });
  const approved = activated || evidence.request?.status === "approved";
  if (!activated) {
    blockers.push("production_access_not_approved");
    checks.push({
      id: "production_access",
      status: approved ? "fail" : "fail",
      detail: approved
        ? "Production review approved but activation is incomplete."
        : "Reviewed production activation is required.",
    });
  } else {
    checks.push({ id: "production_access", status: "pass", detail: "Production application is activated." });
  }

  const prodCallback = hasProductionLaunchpadCallback(evidence.allowedReturnUrls);
  if (!prodCallback) {
    blockers.push("production_callback_missing");
    checks.push({ id: "production_callback", status: "fail", detail: "Add an HTTPS production callback." });
  } else {
    checks.push({ id: "production_callback", status: "pass", detail: "HTTPS production callback is allowlisted." });
    const domainVerified = isVerifiedDomainForCallbacks({
      allowedReturnUrls: evidence.allowedReturnUrls,
      verifiedHostnames: evidence.verifiedHostnames,
    });
    if (!domainVerified) {
      blockers.push("production_callback_domain_unverified");
      checks.push({ id: "callback_domain", status: "fail", detail: "Verify callback domain ownership." });
    } else {
      checks.push({ id: "callback_domain", status: "pass", detail: "Callback domain is verified." });
    }
  }

  if (!app.policy_id || app.policy_version <= 0) {
    blockers.push("policy_not_pinned");
    checks.push({ id: "policy_pin", status: "fail", detail: "Pin policy id and version." });
  } else {
    checks.push({ id: "policy_pin", status: "pass", detail: `${app.policy_id} v${app.policy_version}` });
  }

  if (!activated) {
    blockers.push("sandbox_only_policy");
    checks.push({
      id: "policy_production_eligible",
      status: "fail",
      detail: "Policy is production-usable only after canonical activation pins this app context.",
    });
  } else {
    checks.push({
      id: "policy_production_eligible",
      status: "pass",
      detail: `Policy ${app.policy_id} v${app.policy_version} is pinned for this activated application.`,
    });
  }

  let storedConfig = { purpose: "", action: "", callback_url: null as string | null };
  try {
    const stored = await loadPartnerFlowStoredConfig(app.id, app.partner_id, app.allowed_return_urls);
    storedConfig = {
      purpose: stored.purpose ?? "",
      action: stored.action ?? "",
      callback_url: stored.callback_url ?? null,
    };
  } catch {
    storedConfig = { purpose: "", action: "", callback_url: null };
  }
  if (!storedConfig.purpose || !storedConfig.action || !storedConfig.callback_url) {
    blockers.push("partner_flow_not_configured");
    checks.push({ id: "partner_flow_request", status: "fail", detail: "Configure Partner Flow purpose, action, and callback." });
  } else {
    checks.push({ id: "partner_flow_request", status: "pass", detail: "Partner Flow request is configured." });
    const callbackCheck = validateRegisteredCallback({
      returnUrl: storedConfig.callback_url,
      allowedUrls: app.allowed_return_urls,
      environment: app.environment === "production" ? "production" : "sandbox",
      partnerId: app.partner_id,
      registeredCallbackUrl: storedConfig.callback_url,
      strictLaunchpad: true,
    });
    if (!callbackCheck.ok) {
      if (callbackCheck.errors.includes("callback_http_in_production")) {
        blockers.push("production_callback_not_https");
      }
      checks.push({ id: "callback_security", status: "fail", detail: callbackCheck.errors.join(",") });
    } else {
      checks.push({ id: "callback_security", status: "pass", detail: "Registered callback passes environment checks." });
    }
  }

  const credState = productionCredentialState({
    productionApiKeyId: app.production_api_key_id,
    revoked: input.productionKeyRevoked === true,
    schemaReady: input.schemaReady !== false,
  });
  if (credState === "never_issued" || credState === "unavailable") {
    blockers.push("production_credential_inactive");
    checks.push({ id: "production_credential", status: "fail", detail: "Production credential has not been issued." });
  } else if (credState === "revoked") {
    blockers.push("production_credential_revoked");
    checks.push({ id: "production_credential", status: "fail", detail: "Production credential is revoked." });
  } else {
    checks.push({ id: "production_credential", status: "pass", detail: "Production credential is active." });
  }

  const webhookRequired = input.webhookRequired === true;
  if (webhookRequired && !evidence.webhookConfigured) {
    blockers.push("webhook_required_but_unconfigured");
    checks.push({ id: "webhook", status: "fail", detail: "This integration selected webhooks but none is configured." });
  } else if (webhookRequired) {
    checks.push({ id: "webhook", status: "pass", detail: "Webhook is configured." });
  } else {
    checks.push({ id: "webhook", status: "not_applicable", detail: "Webhook is optional for this integration." });
  }

  const optionalCaps = (input.selectedCapabilities ?? []).filter((cap) =>
    ["wallet_standard_binding", "trading_venue", "payment_authorization", "solana_gate", "partner_activity_signal"].includes(cap),
  );
  for (const cap of optionalCaps) {
    const evidenced = goLive.checks.find((check) => check.id === cap)?.status === "pass";
    if (!evidenced) {
      blockers.push("optional_capability_not_evidenced");
      checks.push({ id: cap, status: "fail", detail: `${cap} selected but not evidenced.` });
    }
  }

  return {
    ok: blockers.length === 0,
    application_id: app.id,
    environment: app.environment,
    lifecycle: goLive.lifecycle,
    blockers: Array.from(new Set(blockers)),
    checks,
    optional_layers_required: optionalCaps,
    core_path_only: true,
  };
}

export function productionReadinessLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  if (/abx_live_[a-z0-9_-]{12,}/.test(blob)) leaks.push("raw_live_key");
  if (/callback_url/.test(blob) && /https:\/\//.test(blob)) leaks.push("callback_url");
  if (/date_of_birth|legal_name|wallet_address/.test(blob)) leaks.push("pii");
  return leaks;
}

export { mapBlocker };
