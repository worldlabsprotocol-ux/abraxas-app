// FILE: lib/sovereignRuntime/stagingCertificationTiers.ts

export type OperationalStagingTier = "OPERATIONAL_STAGING" | "STAGING_NOT_OPERATIONAL" | "BLOCKED";

export type ConfigurationReadinessTier = "STAGING_CONFIGURATION_READY" | "BLOCKED";

export type ObservedHttpTier = "OBSERVED_STAGING_HTTP" | "BLOCKED";

/** Authenticated consent → partner lifecycle on deployed staging only (not synthetic). */
export type FullProtocolLifecycleTier = "FULL_PROTOCOL_LIFECYCLE_CERTIFIED" | "BLOCKED";

export type SyntheticLifecycleTier = "SYNTHETIC_LIFECYCLE_CERTIFIED" | "BLOCKED";

export type RecoveryProofTier = "RECOVERY_DRILL_VERIFIED" | "BLOCKED";

export type Build559CertificationSummary = {
  build: 559;
  configuration_readiness: ConfigurationReadinessTier;
  operational_staging: OperationalStagingTier;
  observed_staging_http: ObservedHttpTier;
  synthetic_lifecycle: SyntheticLifecycleTier;
  full_protocol_lifecycle: FullProtocolLifecycleTier;
  adversarial_trust: "PASS" | "FAIL" | "BLOCKED";
  recovery_proof: RecoveryProofTier;
  synthetic_fixtures_used: boolean;
  human_idv_claimed: false;
  production_readiness_claimed: false;
};

/** Env + inventory only — never implies live operational staging. */
export function deriveConfigurationReadiness(input: {
  staging_persistent_ready: boolean;
  inventory_complete: boolean;
}): ConfigurationReadinessTier {
  if (input.staging_persistent_ready && input.inventory_complete) return "STAGING_CONFIGURATION_READY";
  return "BLOCKED";
}

/** Requires observed database, storage, and deployed HTTP health — not configuration alone. */
export function deriveOperationalStagingTier(input: {
  configuration_ready: boolean;
  observed_database_connectivity: boolean;
  observed_http_staging_health: boolean;
  observed_persistent_storage: boolean;
}): OperationalStagingTier {
  if (
    input.observed_database_connectivity
    && input.observed_http_staging_health
    && input.observed_persistent_storage
  ) {
    return "OPERATIONAL_STAGING";
  }
  if (input.configuration_ready) return "STAGING_NOT_OPERATIONAL";
  return "BLOCKED";
}

/** Full authenticated protocol on deployed staging — not automated in Build #559. */
export function deriveFullProtocolLifecycleTier(_input: {
  operational_staging: OperationalStagingTier;
  observed_lifecycle_http_boundaries: boolean;
}): FullProtocolLifecycleTier {
  return "BLOCKED";
}
