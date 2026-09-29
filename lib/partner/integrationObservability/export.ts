// FILE: lib/partner/integrationObservability/export.ts
// Privacy-safe audit export for partners and operators.

import type { IntegrationEventRow } from "./record";
import { integrationObservabilityLeaks } from "./sanitize";
import { INTEGRATION_OBSERVABILITY_VERSION } from "./contract";

export interface IntegrationAuditExport {
  contract_version: typeof INTEGRATION_OBSERVABILITY_VERSION;
  exported_at: string;
  partner_id: string;
  application_id: string;
  environment: "sandbox" | "production";
  event_count: number;
  events: Array<{
    event_id: string;
    at: string;
    event_type: string;
    lifecycle_stage: string;
    outcome: string | null;
    partner_safe_reason: string | null;
    request_id: string | null;
    receipt_id: string | null;
    policy_id: string | null;
    policy_version: number | null;
    latency_ms: number | null;
    metadata: Record<string, string | number | boolean | null>;
  }>;
}

export function buildIntegrationAuditExport(input: {
  partnerId: string;
  applicationId: string;
  environment: "sandbox" | "production";
  events: IntegrationEventRow[];
}): IntegrationAuditExport | { ok: false; code: "redacted" } {
  const payload: IntegrationAuditExport = {
    contract_version: INTEGRATION_OBSERVABILITY_VERSION,
    exported_at: new Date().toISOString(),
    partner_id: input.partnerId,
    application_id: input.applicationId,
    environment: input.environment,
    event_count: input.events.length,
    events: input.events.map((event) => ({
      event_id: event.event_id,
      at: event.created_at,
      event_type: event.event_type,
      lifecycle_stage: event.lifecycle_stage,
      outcome: event.outcome,
      partner_safe_reason: event.partner_safe_reason,
      request_id: event.request_id,
      receipt_id: event.receipt_id,
      policy_id: event.policy_id,
      policy_version: event.policy_version,
      latency_ms: event.latency_ms,
      metadata: event.metadata,
    })),
  };
  if (integrationObservabilityLeaks(payload).length > 0) {
    return { ok: false, code: "redacted" };
  }
  return payload;
}
