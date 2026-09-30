// FILE: lib/partner/launchpad/journeyInput.ts
// Canonical merchant journey input assembly from authoritative backend evidence.

import type { ApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { LaunchpadJourneyInput } from "@/lib/partner/launchpad/journeyState";
import type { StarterKitPlatform } from "@/lib/partner/starterKit/contract";

export interface MerchantJourneyActivityEvidence {
  starter_kit_generated?: boolean;
  starter_kit_downloaded?: boolean;
  starter_kit_runtime?: string | null;
}

export interface MerchantJourneyIntegrationEvidence {
  verified_receipt_count: number;
  receipt_verification_succeeded_count: number;
  hosted_handoff_completed_count: number;
}

export function verifiedReceiptCountFromSummary(
  summary: ApplicationPoliciesSummary | null | undefined,
): number {
  if (!summary) return 0;
  return summary.bindings.reduce(
    (sum, binding) => sum + (binding.verified_receipts ?? 0),
    0,
  );
}

export function starterKitEvidencedFromActivity(
  activity: MerchantJourneyActivityEvidence,
): boolean {
  return Boolean(activity.starter_kit_generated || activity.starter_kit_downloaded);
}

export function integrationEndToEndEvidenced(
  integration: MerchantJourneyIntegrationEvidence,
): boolean {
  // receipt_verification_succeeded is the authoritative proof that a deployed
  // integration verified a sandbox receipt for this application.
  return integration.receipt_verification_succeeded_count > 0
    || integration.verified_receipt_count > 0;
}

export function buildLaunchpadJourneyInput(input: {
  application: LaunchpadJourneyInput["application"];
  summary?: ApplicationPoliciesSummary | null;
  activity?: MerchantJourneyActivityEvidence;
  integration?: MerchantJourneyIntegrationEvidence;
  activeSandboxKey: boolean;
  productionActivated?: boolean;
  productionRequestPending?: boolean;
  productionRequestApproved?: boolean;
}): LaunchpadJourneyInput {
  const verifiedReceiptCount = input.integration?.verified_receipt_count
    ?? verifiedReceiptCountFromSummary(input.summary);
  const starterKitEvidenced = starterKitEvidencedFromActivity(input.activity ?? {});

  return {
    application: input.application,
    configuredPolicyCount: input.summary?.configured_count
      ?? (input.application.policy_template_id ? 1 : 0),
    verifiedReceiptCount,
    activeSandboxKey: input.activeSandboxKey,
    starterKitEvidenced,
    starterKitPlatform: (input.activity?.starter_kit_runtime as StarterKitPlatform | null | undefined) ?? null,
    productionActivated: input.productionActivated,
    productionRequestPending: input.productionRequestPending,
    productionRequestApproved: input.productionRequestApproved,
  };
}

export function launchpadApplicationToJourneyApplication(
  app: Pick<
    LaunchpadApplicationRow,
    | "id"
    | "status"
    | "environment"
    | "policy_template_id"
    | "policy_id"
    | "allowed_return_urls"
    | "display_name"
    | "application_name"
    | "public_slug"
    | "partner_id"
  > & {
    integration_status?: string;
    key_prefix?: string | null;
  },
): LaunchpadJourneyInput["application"] {
  return {
    id: app.id,
    status: app.status,
    environment: app.environment,
    policy_template_id: app.policy_template_id,
    policy_id: app.policy_id,
    integration_status: app.integration_status ?? "ready",
    allowed_return_urls: app.allowed_return_urls,
    key_prefix: app.key_prefix ?? null,
    display_name: app.display_name,
    application_name: app.application_name,
    public_slug: app.public_slug,
    partner_id: app.partner_id,
  };
}
