// FILE: lib/cielo/cieloFunnelEvents.ts
// Abraxas-side Cielo funnel — integration observability only (not Airbnb metrics).

import { recordIntegrationEventBestEffort } from "@/lib/partner/integrationObservability/record";
import { CIELO_PARTNER_ID, CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/verifiedGuestPolicy";

function applicationId(): string | null {
  return process.env.CIELO_LAUNCHPAD_APPLICATION_ID?.trim() || null;
}

export async function recordCieloFunnelEvent(input: {
  eventType:
    | "holder_flow_started"
    | "holder_flow_completed"
    | "policy_evaluated"
    | "receipt_issued"
    | "verification_request_created";
  outcome?: string | null;
  correlationId?: string | null;
  receiptId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const appId = applicationId();
  if (!appId) return;

  await recordIntegrationEventBestEffort({
    partnerId: CIELO_PARTNER_ID,
    applicationId: appId,
    environment: "sandbox",
    eventType: input.eventType,
    lifecycleStage:
      input.eventType === "receipt_issued" ? "receipt"
        : input.eventType.includes("policy") ? "policy"
          : input.eventType.includes("request") ? "request"
            : "holder",
    outcome: input.outcome ?? null,
    policyId: CIELO_VERIFIED_GUEST_POLICY_ID,
    correlationId: input.correlationId ?? input.requestId ?? null,
    requestId: input.requestId ?? null,
    receiptId: input.receiptId ?? null,
    metadata: {
      merchant: "cielo_sunrise",
      source: "cielo_verified_rate",
      ...(input.metadata ?? {}),
    },
  });
}
