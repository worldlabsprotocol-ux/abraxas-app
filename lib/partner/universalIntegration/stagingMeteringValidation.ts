// FILE: lib/partner/universalIntegration/stagingMeteringValidation.ts
// Read-only staging metering checks — no billing product.

import { auditCommercialMeteringCapabilities } from "./commercialMeteringAudit";

export interface StagingMeteringValidationFinding {
  id: string;
  status: "observed" | "not_observed" | "unverified";
  detail: string;
}

export interface StagingMeteringValidationReport {
  capabilities: ReturnType<typeof auditCommercialMeteringCapabilities>;
  staging_findings: StagingMeteringValidationFinding[];
  reconciliation_ready: boolean;
}

export function validateStagingMeteringExpectations(input: {
  integrationEventTypes?: string[];
  partnerApiUsageObserved?: boolean;
}): StagingMeteringValidationReport {
  const types = new Set(input.integrationEventTypes ?? []);
  const staging_findings: StagingMeteringValidationFinding[] = [
    {
      id: "sandbox_request_event",
      status: types.has("verification_request_created") ? "observed" : "not_observed",
      detail: "partner_integration_events.verification_request_created attributes sandbox request flow",
    },
    {
      id: "receipt_issued_event",
      status: types.has("receipt_issued") ? "observed" : "not_observed",
      detail: "receipt_issued must carry partner_id + application_id for tenant attribution",
    },
    {
      id: "holder_flow_completed",
      status: types.has("holder_flow_completed") ? "observed" : "not_observed",
      detail: "Distinguishes live holder execution from harness-only receipt_verified activity",
    },
    {
      id: "partner_api_usage",
      status: input.partnerApiUsageObserved ? "observed" : "unverified",
      detail: "partner_api_usage rows require operator DB query — not inferred in cloud agent",
    },
  ];

  const reconciliation_ready = staging_findings.every(
    (f) => f.id === "partner_api_usage" ? f.status !== "observed" : true,
  ) && staging_findings.some((f) => f.status === "observed");

  return {
    capabilities: auditCommercialMeteringCapabilities(),
    staging_findings,
    reconciliation_ready: false,
  };
}
