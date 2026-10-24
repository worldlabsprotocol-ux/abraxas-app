// FILE: lib/persistence/boundary/staging/stagingOperationalOwnership.ts
// Redacted staging ownership checklist — no secret emission.

import { buildStagingInfraInventory } from "@/lib/sovereignRuntime/stagingInfraInventory";
import {
  validateStagingPersistentEnv,
  type SovereignActivationIssue,
} from "@/lib/sovereignRuntime/sovereignActivationPolicy";
import { SOVEREIGN_STAGING_DATABASE_ID } from "@/lib/sovereignRuntime/sovereignStagingConstants";

export type StagingOwnershipCheck = {
  id: string;
  label: string;
  satisfied: boolean;
  detail: string;
};

export type ExternalStagingDeploymentStatus =
  | { state: "pending"; reason: string }
  | { state: "attested"; attestation_id: string; http_base_url: string };

export function evaluateExternalStagingDeployment(
  env: Record<string, string | undefined> = process.env,
): ExternalStagingDeploymentStatus {
  const attested = env.ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED?.trim();
  const baseUrl = env.ABRAXAS_STAGING_HTTP_BASE_URL?.trim();
  if (attested && baseUrl) {
    return { state: "attested", attestation_id: attested, http_base_url: baseUrl };
  }
  return {
    state: "pending",
    reason:
      "No founder-attested external sovereign staging host (set ABRAXAS_STAGING_HTTP_BASE_URL and ABRAXAS_EXTERNAL_STAGING_DEPLOYMENT_ATTESTED after deployment proof)",
  };
}

export function buildStagingOperationalOwnershipChecklist(
  env: Record<string, string | undefined> = process.env,
): StagingOwnershipCheck[] {
  const inventory = buildStagingInfraInventory(env);
  const persistent = validateStagingPersistentEnv(env);
  const issueCodes = new Set(persistent.errors.map((e: SovereignActivationIssue) => e.code));

  return [
    {
      id: "admin_database_identity",
      label: "Fixed sovereign staging database identity",
      satisfied: inventory.sovereign_database_id === SOVEREIGN_STAGING_DATABASE_ID,
      detail: inventory.sovereign_database_id ?? "unset",
    },
    {
      id: "postgres_direct_backend",
      label: "Direct PostgreSQL persistence (no PostgREST trust path)",
      satisfied: inventory.persistence_backend === "postgres_direct",
      detail: inventory.persistence_backend ?? "unset",
    },
    {
      id: "distinct_restore_target",
      label: "Independent restore database endpoint",
      satisfied: !issueCodes.has("restore_target_must_differ") && Boolean(inventory.restore_postgres),
      detail: inventory.restore_postgres
        ? `${inventory.restore_postgres.host}:${inventory.restore_postgres.port}/${inventory.restore_postgres.database}`
        : "missing",
    },
    {
      id: "backup_encryption_custody",
      label: "Abraxas-held backup encryption key configured",
      satisfied: inventory.backup_encryption_key_configured,
      detail: inventory.backup_encryption_key_configured ? "configured" : "missing",
    },
    {
      id: "signing_key_custody",
      label: "Abraxas-held issuer signing key configured",
      satisfied: inventory.signing_key_configured,
      detail: inventory.signing_key_configured ? "configured" : "missing",
    },
    {
      id: "no_supabase_on_sovereign_path",
      label: "Supabase credentials absent from sovereign staging env",
      satisfied: !inventory.supabase_env_present,
      detail: inventory.supabase_env_present ? "supabase_env_present" : "absent",
    },
    {
      id: "restore_drill_authorized",
      label: "Restore drill explicitly authorized",
      satisfied: inventory.restore_drill_authorized,
      detail: inventory.restore_drill_authorized ? "authorized" : "not_authorized",
    },
    {
      id: "persistent_env_valid",
      label: "validateStagingPersistentEnv passes",
      satisfied: persistent.ok,
      detail: persistent.ok ? "ok" : persistent.errors[0]?.code ?? "invalid",
    },
  ];
}

export function stagingOwnershipReadyForOperationalProof(
  env: Record<string, string | undefined> = process.env,
): { ok: true } | { ok: false; failed_checks: string[] } {
  const checks = buildStagingOperationalOwnershipChecklist(env);
  const failed = checks.filter((c) => !c.satisfied).map((c) => c.id);
  if (failed.length) return { ok: false, failed_checks: failed };
  return { ok: true };
}
