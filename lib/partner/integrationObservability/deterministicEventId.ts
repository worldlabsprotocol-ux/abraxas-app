// FILE: lib/partner/integrationObservability/deterministicEventId.ts
// Stable integration event ids for database-enforced idempotent lifecycle recording.

import { createHash } from "node:crypto";
import type { IntegrationEventInput } from "./record";

/** Idempotency contract: tenant, environment, type, request, receipt, authorization correlation, application. */
export function buildDeterministicIntegrationEventId(input: IntegrationEventInput): string {
  const seed = [
    input.partnerId,
    input.environment,
    input.eventType,
    input.requestId ?? "",
    input.receiptId ?? "",
    input.correlationId ?? "",
    input.applicationId ?? "",
  ].join("\0");
  return `ie_${createHash("sha256").update(seed).digest("hex").slice(0, 32)}`;
}
