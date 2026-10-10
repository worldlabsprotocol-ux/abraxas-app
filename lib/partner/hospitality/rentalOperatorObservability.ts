// FILE: lib/partner/hospitality/rentalOperatorObservability.ts
// Tenant-scoped funnel events — reusable across rental operators.

import { recordIntegrationEventBestEffort } from "@/lib/partner/integrationObservability/record";
import type {
  IntegrationLifecycleEventType,
  IntegrationLifecycleStage,
} from "@/lib/partner/integrationObservability/contract";
import type { RentalOperatorTenantConfig } from "@/lib/partner/hospitality/rentalOperatorContract";

export type RentalOperatorFunnelEventType =
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

function mapToIntegrationEventType(
  eventType: RentalOperatorFunnelEventType,
): IntegrationLifecycleEventType | null {
  switch (eventType) {
    case "holder_flow_started":
      return "holder_flow_started";
    case "holder_flow_completed":
      return "holder_flow_completed";
    case "policy_evaluated":
      return "policy_evaluated";
    case "receipt_issued":
      return "receipt_issued";
    case "receipt_verified":
      return "receipt_verification_succeeded";
    case "verification_request_created":
    case "verification_request_submitted":
      return "verification_request_created";
    case "operator_decision":
      return "access_decision_permit";
    case "evidence_reused":
      return "evidence_reuse_accepted";
    case "trust_failure":
      return "receipt_verification_failed";
    default:
      return null;
  }
}

function lifecycleStageFor(eventType: RentalOperatorFunnelEventType): IntegrationLifecycleStage {
  if (eventType === "receipt_issued") return "receipt";
  if (eventType === "receipt_verified" || eventType === "trust_failure") return "verification";
  if (eventType === "policy_evaluated") return "policy";
  if (
    eventType === "verification_request_created"
    || eventType === "verification_request_submitted"
    || eventType === "operator_decision"
  ) {
    return "request";
  }
  return "holder";
}

function applicationIdForTenant(tenant: RentalOperatorTenantConfig): string | null {
  const key = tenant.launchpadApplicationIdEnvKey;
  return process.env[key]?.trim() || null;
}

export async function recordRentalOperatorFunnelEvent(
  tenant: RentalOperatorTenantConfig,
  input: {
    eventType: RentalOperatorFunnelEventType;
    outcome?: string | null;
    correlationId?: string | null;
    receiptId?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const appId = applicationIdForTenant(tenant);
  if (!appId) return;

  const integrationEventType = mapToIntegrationEventType(input.eventType);
  if (!integrationEventType) return;

  await recordIntegrationEventBestEffort({
    partnerId: tenant.partnerId,
    applicationId: appId,
    environment: "sandbox",
    eventType: integrationEventType,
    lifecycleStage: lifecycleStageFor(input.eventType),
    outcome: input.outcome ?? null,
    policyId: tenant.policyId,
    correlationId: input.correlationId ?? input.requestId ?? null,
    requestId: input.requestId ?? null,
    receiptId: input.receiptId ?? null,
    metadata: {
      policy_pack_id: tenant.policyPackId ?? null,
      pinned_policy_id: tenant.policyId,
      integration_surface: tenant.integrationSurface,
      ...(input.metadata ?? {}),
    },
  });
}
