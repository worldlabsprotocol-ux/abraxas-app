// FILE: lib/partner/partnerPortalCapabilities.ts
// Capability-aware partner portal presentation — scoped to the authenticated API key only.

import { partnerHasWebhooksReadScope } from "@/lib/partner/partnerSandboxIntegrationKit";

export const PORTAL_CAPABILITY_SCOPE_NOTICE =
  "Progress reflects this API key's scopes. Abraxas may have issued other keys with different capabilities for the same partner.";

export const PORTAL_UNSUPPORTED_SCOPE_NOTICE =
  "This API key does not include Partner Flow (verify:credential or verify:registry) or webhook (webhooks:read) portal scopes. Request a key with the scopes you need from Abraxas ops.";

export interface PortalCapabilities {
  verifyCapable: boolean;
  webhookCapable: boolean;
  hasPortalIntegration: boolean;
}

export interface CapabilityAwarePortalStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
}

export interface CapabilityAwarePortalOnboarding {
  steps: CapabilityAwarePortalStep[];
  completed: number;
  total: number;
}

export interface PortalReadinessSnapshot {
  partner_row_ready: boolean;
  assigned_policy_configured: boolean;
  active_sandbox_policy_ready: boolean;
  callback_allowlist_configured: boolean;
  partner_flow_config_ready: boolean;
  key_environment: "sandbox" | "production";
  webhook_track: {
    endpoint_configured: boolean;
    delivery_enabled: boolean;
    sandbox_test_available: boolean;
  };
}

export function partnerVerifyScopesAvailable(scopes: readonly string[]): boolean {
  return scopes.includes("verify:credential") || scopes.includes("verify:registry");
}

export function resolvePortalCapabilities(scopes: readonly string[]): PortalCapabilities {
  const verifyCapable = partnerVerifyScopesAvailable(scopes);
  const webhookCapable = partnerHasWebhooksReadScope(scopes);
  return {
    verifyCapable,
    webhookCapable,
    hasPortalIntegration: verifyCapable || webhookCapable,
  };
}

export function shouldShowMainnetGate(input: {
  scopes: readonly string[];
  keyEnvironment: "sandbox" | "production";
}): boolean {
  return partnerVerifyScopesAvailable(input.scopes) && input.keyEnvironment === "production";
}

export function computeCapabilityAwarePortalOnboarding(input: {
  scopes: readonly string[];
  readiness: PortalReadinessSnapshot;
}): CapabilityAwarePortalOnboarding {
  const capabilities = resolvePortalCapabilities(input.scopes);
  const { readiness } = input;
  const steps: CapabilityAwarePortalStep[] = [
    {
      id: "key_authenticated",
      title: "API key authenticated",
      description: "You are signed in with your issued abx_test_ or abx_live_ key.",
      done: true,
    },
  ];

  if (capabilities.verifyCapable) {
    steps.push(
      {
        id: "partner_row_ready",
        title: "Partner row provisioned",
        description: "Abraxas ops created your external design partner row.",
        done: readiness.partner_row_ready,
      },
      {
        id: "assigned_policy_configured",
        title: "Sandbox policy assigned",
        description: "Abraxas ops bound an assigned sandbox policy family to your partner row.",
        done: readiness.assigned_policy_configured,
      },
      {
        id: "sandbox_policy_active",
        title: "Active sandbox policy published",
        description: "Exactly one active version of your assigned policy has sandbox_only: true.",
        done: readiness.active_sandbox_policy_ready,
      },
      {
        id: "callback_allowlist_configured",
        title: "Callback allowlist configured",
        description: "Abraxas ops allowlisted your HTTPS callback. They supply the exact return_url out-of-band.",
        done: readiness.callback_allowlist_configured,
      },
      {
        id: "partner_flow_config_ready",
        title: "Ready to start Partner Flow test",
        description: "Operator provisioning is complete. This does not mean a holder flow succeeded.",
        done: readiness.partner_flow_config_ready,
      },
    );
  }

  if (capabilities.webhookCapable) {
    steps.push(
      {
        id: "webhook_endpoint_configured",
        title: "Webhook endpoint configured",
        description: "Abraxas ops registered your HTTPS callback endpoint.",
        done: readiness.webhook_track.endpoint_configured,
      },
      {
        id: "webhook_delivery_enabled",
        title: "Webhook delivery enabled",
        description: "Outbound webhook delivery is enabled for your partner.",
        done: readiness.webhook_track.delivery_enabled,
      },
      {
        id: "webhook_sandbox_test_available",
        title: "Sandbox test enqueue available",
        description: "You may queue a sandbox test event from this portal when ops provisioning is complete.",
        done: readiness.webhook_track.sandbox_test_available,
      },
    );
  }

  const completed = steps.filter((step) => step.done).length;

  return {
    steps,
    completed,
    total: steps.length,
  };
}
