// FILE: lib/sovereignRuntime/sovereignHealth.ts
// Staging monitoring probe — no secrets in response.

import { accessSync, constants } from "node:fs";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import { probeRecoveryInventoryReady } from "@/lib/databaseRecovery/pgInventory";
import { persistenceUsesDirectPostgres, resolveIndependentPostgresUrl } from "@/lib/persistence/env";
import { chainNeutralIdentitySchemaReadyServer } from "@/lib/persistence/chainNeutralSchemaReady.server";
import {
  parseSovereignEnvClass,
  validateEd25519PrivateJwk,
  validateSovereignDatabaseIdentity,
} from "./sovereignActivationPolicy";
import {
  SOVEREIGN_RUNTIME_SCHEMA_VERSION,
  sovereignRuntimeSchemaFingerprint,
} from "./sovereignStagingConstants";

export type SovereignHealthTier = "STAGING_READY" | "DEGRADED" | "UNCONFIGURED";

export type SovereignHealthReport = {
  build: 558;
  tier: SovereignHealthTier;
  env_class: string | null;
  database_identity_ok: boolean;
  schema_version: typeof SOVEREIGN_RUNTIME_SCHEMA_VERSION;
  schema_fingerprint_sha256: string;
  persistence_backend: string;
  authorization_default: "deny_unavailable";
  checks: {
    postgres: "ok" | "unavailable" | "skipped";
    recovery_inventory_ready: boolean;
    chain_neutral_schema_ready: boolean;
    evidence_root: "ok" | "missing" | "unreadable";
    signing_key_configured: boolean;
  };
};

function evidenceRootStatus(root: string | undefined): SovereignHealthReport["checks"]["evidence_root"] {
  if (!root?.trim()) return "missing";
  try {
    accessSync(root.trim(), constants.R_OK | constants.W_OK);
    return "ok";
  } catch {
    return "unreadable";
  }
}

export async function buildSovereignHealthReport(
  env: Record<string, string | undefined> = process.env,
): Promise<SovereignHealthReport> {
  const envClass = parseSovereignEnvClass(env);
  const identityErr = validateSovereignDatabaseIdentity(env);
  const databaseUrl = resolveIndependentPostgresUrl(env);
  const direct = persistenceUsesDirectPostgres(env);

  let postgres: SovereignHealthReport["checks"]["postgres"] = "skipped";
  let recoveryInventoryReady = false;
  let chainNeutralReady = false;

  if (direct && databaseUrl) {
    try {
      const client = await createRecoveryPgClient({ databaseUrl, env });
      try {
        await client.query("select 1 as ok");
        postgres = "ok";
        recoveryInventoryReady = await probeRecoveryInventoryReady(client);
      } finally {
        await client.end();
      }
    } catch {
      postgres = "unavailable";
    }
    try {
      chainNeutralReady = await chainNeutralIdentitySchemaReadyServer(true);
    } catch {
      chainNeutralReady = false;
    }
  }

  const checks: SovereignHealthReport["checks"] = {
    postgres,
    recovery_inventory_ready: recoveryInventoryReady,
    chain_neutral_schema_ready: chainNeutralReady,
    evidence_root: evidenceRootStatus(env.ABRAXAS_EVIDENCE_STORAGE_ROOT),
    signing_key_configured: validateEd25519PrivateJwk(env.ABRAXAS_SIGNING_KEY),
  };

  const configured =
    direct
    && !identityErr
    && envClass === "staging"
    && checks.signing_key_configured
    && checks.evidence_root === "ok";

  let tier: SovereignHealthTier = "UNCONFIGURED";
  if (configured) {
    const criticalOk =
      checks.postgres === "ok"
      && checks.recovery_inventory_ready
      && checks.chain_neutral_schema_ready;
    tier = criticalOk ? "STAGING_READY" : "DEGRADED";
  }

  return {
    build: 558,
    tier,
    env_class: envClass,
    database_identity_ok: !identityErr,
    schema_version: SOVEREIGN_RUNTIME_SCHEMA_VERSION,
    schema_fingerprint_sha256: sovereignRuntimeSchemaFingerprint(),
    persistence_backend: env.ABRAXAS_PERSISTENCE_BACKEND?.trim() ?? "supabase_postgrest",
    authorization_default: "deny_unavailable",
    checks,
  };
}
