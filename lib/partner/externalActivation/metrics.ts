// FILE: lib/partner/externalActivation/metrics.ts
// Privacy-safe time-to-first-proof metrics for developer applications.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import { isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";
import type { DeveloperTimeToProofMetrics } from "./contract";

export function computeDeveloperTimeToProofMetrics(input: {
  application: LaunchpadApplicationRow;
  events: IntegrationEventRow[];
}): DeveloperTimeToProofMetrics {
  const createdMs = new Date(input.application.created_at).getTime();

  function firstMs(types: string[]): number | null {
    for (const event of input.events.filter(isLiveEvent)) {
      if (event.environment !== "sandbox") continue;
      if (!types.includes(event.event_type)) continue;
      return new Date(event.created_at).getTime();
    }
    return null;
  }

  function duration(start: number, end: number | null): number | null {
    if (end == null || end < start) return null;
    return end - start;
  }

  const firstRequest = firstMs(["verification_request_created", "hosted_handoff_created"]);
  const firstReceipt = firstMs(["receipt_issued"]);
  const firstVerified = firstMs(["receipt_verification_succeeded"]);

  return {
    application_created_at: input.application.created_at,
    first_verification_request_at: firstRequest ? new Date(firstRequest).toISOString() : null,
    first_receipt_issued_at: firstReceipt ? new Date(firstReceipt).toISOString() : null,
    first_verified_result_at: firstVerified ? new Date(firstVerified).toISOString() : null,
    time_to_first_request_ms: duration(createdMs, firstRequest),
    time_to_first_receipt_ms: duration(createdMs, firstReceipt),
    time_to_first_verified_result_ms: duration(createdMs, firstVerified),
  };
}
