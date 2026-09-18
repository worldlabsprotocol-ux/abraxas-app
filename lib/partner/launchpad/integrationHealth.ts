// FILE: lib/partner/launchpad/integrationHealth.ts
// Deterministic health report for a partner integration. No client supplied status is trusted.

import type { LaunchpadApplicationRow } from "./types";
import { hasProductionLaunchpadCallback } from "./productionCallbackReadiness";
import { isVerifiedDomainForCallbacks } from "./domainVerification";

export type LaunchpadHealthStatus = "pass" | "action_required" | "blocked";

export interface LaunchpadHealthCheck {
  id: "application" | "policy" | "sandbox_key" | "callback" | "domain" | "production";
  label: string;
  status: LaunchpadHealthStatus;
  detail: string;
}

export function buildLaunchpadIntegrationHealth(input: {
  application: LaunchpadApplicationRow;
  activeSandboxKey: boolean;
  activeProductionKey: boolean;
  verifiedHostnames: string[];
}): { overall: LaunchpadHealthStatus; checks: LaunchpadHealthCheck[] } {
  const { application: app } = input;
  const productionCallback = hasProductionLaunchpadCallback(app.allowed_return_urls);
  const domainVerified = isVerifiedDomainForCallbacks({
    allowedReturnUrls: app.allowed_return_urls,
    verifiedHostnames: input.verifiedHostnames,
  });
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
      id: "sandbox_key", label: "Sandbox credential",
      status: input.activeSandboxKey ? "pass" : "blocked",
      detail: input.activeSandboxKey ? "An active sandbox credential is available." : "Rotate a sandbox credential before testing the integration.",
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
      id: "production", label: "Production activation",
      status: app.environment === "production" && input.activeProductionKey ? "pass" : (productionCallback && domainVerified ? "action_required" : "blocked"),
      detail: app.environment === "production" && input.activeProductionKey
        ? "Production is active with a scoped credential."
        : productionCallback && domainVerified
          ? "All automated safety checks passed. Activate production when ready."
          : "Production remains fail-closed until callback and domain checks pass.",
    },
  ];
  const overall: LaunchpadHealthStatus = checks.some((check) => check.status === "blocked")
    ? "blocked"
    : checks.some((check) => check.status === "action_required") ? "action_required" : "pass";
  return { overall, checks };
}
