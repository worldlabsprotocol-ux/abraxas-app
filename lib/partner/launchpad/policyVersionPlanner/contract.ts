// FILE: lib/partner/launchpad/policyVersionPlanner/contract.ts
// Read-only policy version coordination. Never adopts, edits, or issues keys.

import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";
import { INTEGRATION_STUDIO_PATH } from "@/lib/partner/integrationStudio/contract";
import { PARTNER_ACTIVATION_LAUNCHPAD } from "@/lib/partner/activationPath/contract";
import { GO_LIVE_REVIEW_PATH } from "@/lib/partner/launchpad/goLiveReadiness/contract";
import { launchpadSandboxTestHref } from "@/lib/partner/launchpad/sandboxTestConsole/contract";

export const POLICY_VERSION_PLANNER_VERSION = "1.0.0" as const;
export const POLICY_VERSION_PLANNER_ENTRY = "Policy version" as const;

export const POLICY_VERSION_AVAILABILITY = [
  "no_newer",
  "newer_planning",
  "deprecated",
  "catalog_unknown",
] as const;
export type PolicyVersionAvailability = (typeof POLICY_VERSION_AVAILABILITY)[number];

export const POLICY_VERSION_COMPATIBILITY = [
  "unchanged",
  "sandbox_retest",
  "policy_review",
] as const;
export type PolicyVersionCompatibilityResult = (typeof POLICY_VERSION_COMPATIBILITY)[number];

export const POLICY_VERSION_PATHS = [
  "webhooks",
  "trading",
  "payment",
  "wallet_standard",
  "solana",
  "starter_kit",
] as const;
export type PolicyVersionPathId = (typeof POLICY_VERSION_PATHS)[number];

export const POLICY_VERSION_FORBIDDEN_KEYS = [
  "policy_id",
  "policy_version",
  "target_version",
  "current_version",
  "environment",
  "partner_id",
  "api_key",
  "production",
  "activate_production",
  "issue_production_key",
  "receipt_id",
  "return_url",
  "approval",
  "callback",
  "disclosure_profile",
  "claim_allowlist",
  "withheld_override",
  "allowed_fields",
] as const;

export const POLICY_VERSION_GOOGLE = GOOGLE_ACCOUNT_NOT_ELIGIBILITY;

export const POLICY_VERSION_NOTICE =
  "This planner does not change the pinned policy, Holder flows, callbacks, keys, receipts, webhooks, or Production status.";

export function launchpadPolicyVersionHref(applicationId?: string | null): string {
  if (!applicationId) return `${PARTNER_ACTIVATION_LAUNCHPAD}?view=versions`;
  return `${PARTNER_ACTIVATION_LAUNCHPAD}?app=${encodeURIComponent(applicationId)}&view=versions`;
}

export function studioPolicyVersionHandoffHref(packId: string, catalogVersion: number): string {
  return `${INTEGRATION_STUDIO_PATH}?pack=${encodeURIComponent(packId)}&catalog_version=${encodeURIComponent(String(catalogVersion))}`;
}

export function policyVersionNextHrefs(applicationId: string) {
  return {
    continue_current: launchpadPolicyVersionHref(applicationId),
    studio: INTEGRATION_STUDIO_PATH,
    create_sandbox: INTEGRATION_STUDIO_PATH,
    test_console: launchpadSandboxTestHref(applicationId),
    production_review: `${GO_LIVE_REVIEW_PATH}?app=${encodeURIComponent(applicationId)}&view=test`,
  };
}
