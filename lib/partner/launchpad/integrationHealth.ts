// FILE: lib/partner/launchpad/integrationHealth.ts
// Deterministic health report for a partner integration. No client supplied status is trusted.

import type { LaunchpadApplicationRow } from "./types";
import { hasProductionLaunchpadCallback } from "./productionCallbackReadiness";
import { isVerifiedDomainForCallbacks } from "./domainVerification";
import { resolvePolicyPack, policyPackIsSandboxOnly } from "./policyPacks";
import { CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID } from "./customPolicy";
import { REQUIRED_HARNESS_SCENARIOS, type PartnerHarnessScenarioId } from "./partnerTestHarness";
import type { PartnerVisibleDeliveryState } from "@/lib/partner/eventDelivery/contract";
import { recommendPartnerActionChannel } from "@/lib/partner/eventDelivery/mapping";

export type LaunchpadHealthStatus = "pass" | "action_required" | "blocked";

export interface LaunchpadHealthCheck {
  id:
    | "application"
    | "policy"
    | "policy_pack"
    | "sandbox_key"
    | "harness"
    | "callback"
    | "domain"
    | "webhook"
    | "webhook_secret"
    | "webhook_delivery"
    | "webhook_failure"
    | "action_channel"
    | "production";
  label: string;
  status: LaunchpadHealthStatus;
  detail: string;
}

export function buildLaunchpadIntegrationHealth(input: {
  application: LaunchpadApplicationRow;
  activeSandboxKey: boolean;
  activeProductionKey: boolean;
  verifiedHostnames: string[];
  harnessCompleted?: PartnerHarnessScenarioId[];
  webhookConfigured?: boolean;
  webhookEnabled?: boolean;
  signingSecretAvailable?: boolean;
  latestDeliveryStatus?: PartnerVisibleDeliveryState | null;
  deliveryFailureBlocker?: boolean;
}): { overall: LaunchpadHealthStatus; checks: LaunchpadHealthCheck[] } {
  const { application: app } = input;
  const productionCallback = hasProductionLaunchpadCallback(app.allowed_return_urls);
  const domainVerified = isVerifiedDomainForCallbacks({
    allowedReturnUrls: app.allowed_return_urls,
    verifiedHostnames: input.verifiedHostnames,
  });
  const pack = resolvePolicyPack(app.policy_template_id);
  const custom = app.policy_template_id === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID;
  const sandboxOnlyPack = pack ? policyPackIsSandboxOnly(pack) : true;
  const completed = new Set(input.harnessCompleted ?? []);
  const missingHarness = REQUIRED_HARNESS_SCENARIOS.filter((id) => !completed.has(id));
  const harnessPassed = missingHarness.length === 0;

  const checks: LaunchpadHealthCheck[] = [
    {
      id: "application", label: "Application status",
      status: app.status === "active" ? "pass" : "blocked",
      detail: app.status === "active" ? "Application is active." : "Reactivate this application before accepting verification requests.",
    },
    {
      id: "policy", label: "Policy configuration",
      status: app.policy_id && app.policy_version > 0 ? "pass" : "blocked",
      detail: app.policy_id ? `Policy ${app.policy_id} v${app.policy_version} is pinned to receipts.` : "Configure a policy before testing.",
    },
    {
      id: "policy_pack",
      label: "Policy pack",
      status: pack || custom ? "pass" : "blocked",
      detail: pack
        ? `${pack.display_name}. Catalog suitability: ${pack.production_suitability.replace(/_/g, " ")}. Google sign-in is not eligibility.`
        : custom
          ? "Constrained custom sandbox policy. Custom policies remain sandbox-only."
          : "Select a policy pack before testing.",
    },
    {
      id: "sandbox_key", label: "Sandbox credential",
      status: input.activeSandboxKey ? "pass" : "blocked",
      detail: input.activeSandboxKey ? "An active sandbox credential is available." : "Rotate a sandbox credential before testing the integration.",
    },
    {
      id: "harness",
      label: "Integration test harness",
      status: harnessPassed ? "pass" : "action_required",
      detail: harnessPassed
        ? "All required harness outcomes passed using receipt trust evaluation."
        : `Run the remaining harness cases: ${missingHarness.join(", ")}. Activation stays blocked until the harness passes.`,
    },
    {
      id: "callback", label: "Production callback",
      status: productionCallback ? "pass" : "action_required",
      detail: productionCallback ? "An HTTPS callback is configured." : "Add a public HTTPS callback URL; localhost is sandbox-only.",
    },
    {
      id: "domain", label: "Domain ownership",
      status: domainVerified ? "pass" : "action_required",
      detail: domainVerified ? "The callback domain is verified by DNS TXT proof." : "Create and verify the DNS TXT challenge for the production callback domain.",
    },
    {
      id: "webhook",
      label: "Webhook configured",
      status: input.webhookConfigured ? "pass" : "action_required",
      detail: input.webhookConfigured
        ? "A webhook endpoint is registered for lifecycle events."
        : "Add an HTTPS webhook endpoint in Partner Event Delivery to receive signed events with no PII.",
    },
    {
      id: "webhook_secret",
      label: "Signing secret available",
      status: input.signingSecretAvailable ? "pass" : "action_required",
      detail: input.signingSecretAvailable
        ? "A webhook signing secret is stored. Copy it only at create or rotate time."
        : "Create or rotate a webhook signing secret and store it on your server.",
    },
    {
      id: "webhook_delivery",
      label: "Latest delivery status",
      status: !input.webhookConfigured
        ? "action_required"
        : input.latestDeliveryStatus === "delivered"
          ? "pass"
          : input.latestDeliveryStatus === "retrying"
            ? "action_required"
            : input.latestDeliveryStatus === "failed" || input.latestDeliveryStatus === "dead-lettered"
              ? "blocked"
              : "action_required",
      detail: input.latestDeliveryStatus
        ? `Latest partner-visible delivery state: ${input.latestDeliveryStatus}. Delivery is best effort, not guaranteed.`
        : "No webhook deliveries yet. Send a labeled test event after enabling delivery.",
    },
    {
      id: "webhook_failure",
      label: "Delivery failure blocker",
      status: input.deliveryFailureBlocker ? "blocked" : "pass",
      detail: input.deliveryFailureBlocker
        ? "A failed or dead-lettered delivery needs a safe redelivery after you fix the endpoint."
        : "No failed webhook deliveries are blocking this integration.",
    },
    {
      id: "action_channel",
      label: "Partner action channel",
      status: recommendPartnerActionChannel({
        webhookConfigured: Boolean(input.webhookConfigured),
        webhookEnabled: Boolean(input.webhookEnabled),
        callbackConfigured: productionCallback,
      }) === "none"
        ? "action_required"
        : "pass",
      detail: (() => {
        const channel = recommendPartnerActionChannel({
          webhookConfigured: Boolean(input.webhookConfigured),
          webhookEnabled: Boolean(input.webhookEnabled),
          callbackConfigured: productionCallback,
        });
        if (channel === "both") {
          return "Use the callback for the holder return and the webhook for lifecycle updates. Verify the receipt on your server either way.";
        }
        if (channel === "webhook") {
          return "Webhook is the lifecycle channel. Keep a callback for holder return, and still verify the receipt server-side.";
        }
        if (channel === "callback") {
          return "Callback is configured. Add a webhook if you need signed lifecycle updates after the holder leaves.";
        }
        return "Configure a callback, a webhook, or both. Never treat a webhook payload as authorization.";
      })(),
    },
    {
      id: "production", label: "Production activation",
      status: app.environment === "production" && input.activeProductionKey
        ? "pass"
        : (productionCallback && domainVerified && harnessPassed && !sandboxOnlyPack ? "action_required" : "blocked"),
      detail: app.environment === "production" && input.activeProductionKey
        ? "Production is active with a scoped credential."
        : !harnessPassed
          ? "Complete the integration test harness before activation."
          : sandboxOnlyPack
            ? "This policy pack is catalog-marked sandbox-only. Choose a production-eligible pack or keep the integration in sandbox."
            : productionCallback && domainVerified
              ? "All automated safety checks passed. Activate production when ready."
              : "Production remains fail-closed until callback, domain, and harness checks pass.",
    },
  ];
  const overall: LaunchpadHealthStatus = checks.some((check) => check.status === "blocked")
    ? "blocked"
    : checks.some((check) => check.status === "action_required") ? "action_required" : "pass";
  return { overall, checks };
}
