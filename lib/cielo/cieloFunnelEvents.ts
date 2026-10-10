// FILE: lib/cielo/cieloFunnelEvents.ts
// Cielo funnel — delegates to reusable rental-operator observability.

import { CIELO_SUNRISE_RENTAL_TENANT } from "@/lib/partner/hospitality/rentalOperatorTenants";
import { recordRentalOperatorFunnelEvent } from "@/lib/partner/hospitality/rentalOperatorObservability";

export async function recordCieloFunnelEvent(input: {
  eventType:
    | "holder_flow_started"
    | "holder_flow_completed"
    | "policy_evaluated"
    | "receipt_issued"
    | "receipt_verified"
    | "verification_request_created"
    | "verification_request_submitted"
    | "operator_decision"
    | "evidence_reused"
    | "trust_failure";
  outcome?: string | null;
  correlationId?: string | null;
  receiptId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordRentalOperatorFunnelEvent(CIELO_SUNRISE_RENTAL_TENANT, {
    ...input,
    metadata: {
      merchant: "cielo_sunrise",
      source: "cielo_verified_rate",
      ...(input.metadata ?? {}),
    },
  });
}
