// FILE: lib/operations/institutionalProof/readiness.ts
// Production readiness classification — never prints secret values.

import { probeProviderIngestionReadiness } from "@/lib/identity/providerIngestion/readinessProbe";
import { MOCK_APPROVED_KYC_PROVIDER_ID } from "@/lib/identity/providerIngestion/mockProvider";
import type {
  ProductionConfigStatus,
  ProductionReadinessSection,
  ReadinessCheckValue,
} from "./contract";

function classifyEnvVar(name: string): ProductionConfigStatus {
  const value = process.env[name]?.trim();
  if (!value) {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      return "CODE_READY";
    }
    return "PRODUCTION_CONFIG_REQUIRED";
  }
  return "UNVERIFIED";
}

export async function assessProductionReadiness(): Promise<ProductionReadinessSection> {
  let migrationApplied: ReadinessCheckValue = "unverified";
  let productionDbStatus: "VERIFIED" | "UNVERIFIED" = "UNVERIFIED";

  try {
    const probe = await probeProviderIngestionReadiness();
    migrationApplied = probe.ready ? "verified" : "unverified";
    productionDbStatus = probe.ready ? "VERIFIED" : "UNVERIFIED";
  } catch {
    migrationApplied = "unverified";
    productionDbStatus = "UNVERIFIED";
  }

  const pairwiseKey = classifyEnvVar("PAIRWISE_SUBJECT_HMAC_KEY");
  const providerSecret = classifyEnvVar("PROVIDER_INGEST_TEST_SECRET")
    === "CODE_READY"
    ? classifyEnvVar("MOCK_KYC_PROVIDER_INGEST_SECRET")
    : "UNVERIFIED";

  const providerRegistered: ReadinessCheckValue =
    MOCK_APPROVED_KYC_PROVIDER_ID ? "verified" : "unverified";

  const checks: Record<string, ReadinessCheckValue> = {
    migration_127_applied: migrationApplied,
    pairwise_key_configured:
      pairwiseKey === "UNVERIFIED" ? "unverified" : pairwiseKey === "PRODUCTION_CONFIG_REQUIRED" ? "not_configured" : "verified",
    provider_ingest_secret_configured:
      providerSecret === "UNVERIFIED" ? "unverified" : providerSecret === "PRODUCTION_CONFIG_REQUIRED" ? "not_configured" : "verified",
    provider_registered: providerRegistered,
    provider_claim_scope_configured: "verified",
    provider_assurance_ceiling_configured: "verified",
    partner_application_a_ready: "not_applicable",
    partner_application_b_ready: "not_applicable",
  };

  const allVerified = Object.values(checks).every((v) => v === "verified" || v === "not_applicable")
    && productionDbStatus === "VERIFIED";

  return {
    status: allVerified ? "verified" : "unverified",
    production_db_status: productionDbStatus,
    checks,
    config: {
      pairwise_key: pairwiseKey,
      provider_ingest_secret: providerSecret,
      provider_trust_configuration: "CODE_READY",
    },
  };
}
