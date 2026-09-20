// FILE: lib/partner/launchpad/sandboxTestConsole/view.ts
// Tenant-scoped readiness projection. Client-supplied IDs are never authority.

import { validateLaunchpadReturnUrl } from "@/lib/partner/launchpad/returnUrl";
import {
  SANDBOX_TEST_CONSOLE_ENTRY,
  SANDBOX_TEST_CONSOLE_PLATFORMS,
  SANDBOX_TEST_CONSOLE_PRODUCTION,
  buildSandboxTestChecklist,
  sanitizeSandboxTestCapabilities,
  type SandboxTestCheck,
} from "./contract";
import { buildSandboxTestFixtures } from "./fixtures";

export interface SandboxTestConsoleAppSnapshot {
  application_id: string;
  status: string;
  environment: string;
  policy_version: number;
  policy_template_id: string;
  allowed_return_urls: string[];
  has_sandbox_key: boolean;
  webhook_configured: boolean;
}

export function buildSandboxTestConsoleView(
  app: SandboxTestConsoleAppSnapshot,
  capabilities: readonly string[] = [],
) {
  const selected = sanitizeSandboxTestCapabilities(capabilities);
  const callbackOk = app.allowed_return_urls.length > 0
    && app.allowed_return_urls.every((url) => validateLaunchpadReturnUrl(url).ok);
  const checks: SandboxTestCheck[] = [
    {
      id: "sandbox_app",
      label: "Sandbox app exists and is active",
      status: app.status === "active" && app.environment === "sandbox" ? "pass" : "action_required",
      next_step: app.status === "active" ? "Continue the local fixture checklist." : "Resume this app in Launchpad and confirm it is an active sandbox.",
    },
    {
      id: "policy_pin",
      label: "Pinned policy and version",
      status: app.policy_template_id && app.policy_version > 0 ? "pass" : "action_required",
      next_step: "Keep the generated kit pinned to the same policy version.",
    },
    {
      id: "callback",
      label: "Callback URL validity",
      status: callbackOk ? "pass" : "action_required",
      next_step: callbackOk
        ? "Use the local callback fixture against your kit."
        : "Add a localhost or HTTPS allowlisted callback in Launchpad.",
    },
    {
      id: "sandbox_key",
      label: "Sandbox key state",
      status: app.has_sandbox_key ? "pass" : "action_required",
      next_step: app.has_sandbox_key
        ? "The raw key is not shown here. Use the prefix you copied at create time."
        : "Create or rotate a sandbox key in Launchpad. The raw key is shown once.",
    },
    {
      id: "integration_path",
      label: "Selected integration path",
      status: "pass",
      next_step: "Hosted Partner Flow plus server-side receipt verification is the default Launchpad path.",
    },
    {
      id: "starter_kit",
      label: "Starter Kit availability",
      status: "pass",
      next_step: "Generate a kit in Integration Studio for Universal HTTPS, Next.js, Express, Wix Velo, or Serverless.",
    },
    {
      id: "webhooks",
      label: "Webhook configuration",
      status: selected.includes("webhooks")
        ? (app.webhook_configured ? "pass" : "action_required")
        : "not_selected",
      next_step: selected.includes("webhooks")
        ? (app.webhook_configured ? "Use the local HMAC fixture. Do not send a live webhook." : "Configure a signed webhook endpoint, then use the local fixture.")
        : "Shown only when webhooks are selected.",
    },
    {
      id: "trading_venue",
      label: "Trading preflight capability",
      status: selected.includes("trading_venue") ? "action_required" : "not_selected",
      next_step: selected.includes("trading_venue")
        ? "Configure sandbox, test receipt preflight and nonce handling, then build the venue’s own execution and request Production review."
        : "Shown only when trading is selected.",
    },
    {
      id: "payment_authorization",
      label: "Payment preflight capability",
      status: selected.includes("payment_authorization") ? "action_required" : "not_selected",
      next_step: selected.includes("payment_authorization")
        ? "Use the allow/deny-shaped local fixtures. Abraxas does not move money."
        : "Shown only when payment is selected.",
    },
    {
      id: "wallet_standard_binding",
      label: "Wallet Standard binding",
      status: selected.includes("wallet_standard_binding") ? "action_required" : "not_selected",
      next_step: selected.includes("wallet_standard_binding")
        ? "Binding is optional and message-only. Never sign a transaction."
        : "Shown only when wallet binding is selected.",
    },
    {
      id: "solana_gate",
      label: "Solana eligibility gate",
      status: selected.includes("solana_gate") ? "action_required" : "not_selected",
      next_step: selected.includes("solana_gate")
        ? "Use the Solana starter path. No funds movement."
        : "Shown only when Solana is selected.",
    },
  ];

  return {
    ok: true as const,
    entry: SANDBOX_TEST_CONSOLE_ENTRY,
    application_id: app.application_id,
    live: false,
    issues_production_key: false,
    grants_production: false,
    production: SANDBOX_TEST_CONSOLE_PRODUCTION,
    platforms: SANDBOX_TEST_CONSOLE_PLATFORMS,
    selected_capabilities: selected,
    checks,
    fixtures: buildSandboxTestFixtures(selected),
    checklist: buildSandboxTestChecklist(selected),
  };
}
