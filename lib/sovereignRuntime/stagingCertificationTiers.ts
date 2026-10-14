// FILE: lib/sovereignRuntime/stagingCertificationTiers.ts

export type OperationalStagingTier = "OPERATIONAL_STAGING" | "STAGING_NOT_OPERATIONAL" | "BLOCKED";

export type ObservedHttpTier = "OBSERVED_STAGING_HTTP" | "BLOCKED";

/** Smoke HTTP only — never implies wallet→receipt E2E on deployed staging. */
export type FullProtocolLifecycleTier =
  | "FULL_PROTOCOL_LIFECYCLE_CERTIFIED"
  | "SYNTHETIC_LIFECYCLE_CERTIFIED"
  | "BLOCKED";

export type RecoveryProofTier = "RECOVERY_DRILL_VERIFIED" | "BLOCKED";

export type Build559CertificationSummary = {
  build: 559;
  operational_staging: OperationalStagingTier;
  observed_staging_http: ObservedHttpTier;
  full_protocol_lifecycle: FullProtocolLifecycleTier;
  adversarial_trust: "PASS" | "FAIL" | "BLOCKED";
  recovery_proof: RecoveryProofTier;
  synthetic_fixtures_used: boolean;
  human_idv_claimed: false;
  production_readiness_claimed: false;
};

export function deriveOperationalStagingTier(input: {
  staging_persistent_ready: boolean;
  inventory_complete: boolean;
}): OperationalStagingTier {
  if (input.staging_persistent_ready && input.inventory_complete) return "OPERATIONAL_STAGING";
  if (input.inventory_complete) return "STAGING_NOT_OPERATIONAL";
  return "BLOCKED";
}
