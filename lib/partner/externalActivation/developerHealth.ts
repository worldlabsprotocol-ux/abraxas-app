// FILE: lib/partner/externalActivation/developerHealth.ts
// Minimal developer integration health — not a duplicate Launchpad dashboard.

import { callbackConfigured } from "@/lib/partner/launchpad/journeyState";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import { isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";
import type { DeveloperIntegrationHealthView } from "./contract";

export function buildDeveloperIntegrationHealth(input: {
  application: LaunchpadApplicationRow;
  events: IntegrationEventRow[];
  activeSandboxKey: boolean;
}): DeveloperIntegrationHealthView {
  const app = input.application;
  const live = input.events.filter(isLiveEvent);
  const verified = live.some((e) => e.event_type === "receipt_verification_succeeded");
  const requestCreated = live.some((e) =>
    e.event_type === "verification_request_created" || e.event_type === "hosted_handoff_created");
  const receiptIssued = live.some((e) => e.event_type === "receipt_issued");

  const recentFailure = live.find((e) => e.event_type === "receipt_verification_failed");

  const items = [
    {
      id: "sandbox_configured",
      label: "Sandbox configured",
      status: app.status === "active" && app.environment === "sandbox" ? "ready" as const : "pending" as const,
      detail: app.environment === "sandbox" ? "Sandbox application active" : null,
    },
    {
      id: "callback",
      label: "Callback configured",
      status: callbackConfigured(app.allowed_return_urls) ? "ready" as const : "pending" as const,
      detail: app.allowed_return_urls[0] ?? null,
    },
    {
      id: "credential",
      label: "Credential active",
      status: app.api_key_id && input.activeSandboxKey ? "ready" as const : "pending" as const,
      detail: input.activeSandboxKey ? "Sandbox API key issued" : "Create or rotate sandbox key",
    },
    {
      id: "first_request",
      label: "First request",
      status: requestCreated ? "ready" as const : "pending" as const,
      detail: requestCreated ? "Verification request observed" : null,
    },
    {
      id: "first_verified",
      label: "First verified result",
      status: verified ? "ready" as const : receiptIssued ? "pending" as const : "pending" as const,
      detail: verified ? "Server-side narrow result verified" : null,
    },
  ];

  return {
    items,
    recent_failure_category: recentFailure?.partner_safe_reason ?? null,
    sandbox_labeled: true,
  };
}
