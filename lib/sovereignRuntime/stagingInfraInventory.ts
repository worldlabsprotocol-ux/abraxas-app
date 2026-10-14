// FILE: lib/sovereignRuntime/stagingInfraInventory.ts
// Redacted staging infrastructure inventory (never emits secret values).

import { parsePostgresEndpoint } from "./pgConnectionIdentity";
import { parseSovereignEnvClass } from "./sovereignActivationPolicy";
import { SOVEREIGN_STAGING_DATABASE_ID } from "./sovereignStagingConstants";

export type StagingInfraInventory = {
  build: 559;
  persistence_backend: string | null;
  sovereign_env_class: string | null;
  sovereign_database_id: string | null;
  staging_database_id_expected: typeof SOVEREIGN_STAGING_DATABASE_ID;
  primary_postgres: { host: string; port: number; database: string } | null;
  restore_postgres: { host: string; port: number; database: string } | null;
  evidence_storage_root_set: boolean;
  backup_scope: string | null;
  backup_output_dir_set: boolean;
  staging_http_base_url_set: boolean;
  signing_key_configured: boolean;
  evidence_encryption_key_configured: boolean;
  backup_encryption_key_configured: boolean;
  supabase_env_present: boolean;
  restore_drill_authorized: boolean;
  migration_authorized: boolean;
};

function redactedEndpoint(url: string | undefined): StagingInfraInventory["primary_postgres"] {
  const parsed = parsePostgresEndpoint(url);
  if (!parsed.ok) return null;
  return parsed.endpoint;
}

export function buildStagingInfraInventory(
  env: Record<string, string | undefined> = process.env,
): StagingInfraInventory {
  const primary =
    env.ABRAXAS_DATABASE_URL?.trim()
    ?? env.ABRAXAS_SOVEREIGN_PG_URL?.trim();
  const restore =
    env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL?.trim()
    ?? env.ABRAXAS_RESTORE_DATABASE_URL?.trim();

  return {
    build: 559,
    persistence_backend: env.ABRAXAS_PERSISTENCE_BACKEND?.trim() ?? null,
    sovereign_env_class: parseSovereignEnvClass(env),
    sovereign_database_id: env.ABRAXAS_SOVEREIGN_DATABASE_ID?.trim() ?? null,
    staging_database_id_expected: SOVEREIGN_STAGING_DATABASE_ID,
    primary_postgres: redactedEndpoint(primary),
    restore_postgres: redactedEndpoint(restore),
    evidence_storage_root_set: Boolean(env.ABRAXAS_EVIDENCE_STORAGE_ROOT?.trim()),
    backup_scope: env.ABRAXAS_BACKUP_SCOPE?.trim() ?? null,
    backup_output_dir_set: Boolean(env.ABRAXAS_BACKUP_OUTPUT_DIR?.trim()),
    staging_http_base_url_set: Boolean(env.ABRAXAS_STAGING_HTTP_BASE_URL?.trim()),
    signing_key_configured: Boolean(env.ABRAXAS_SIGNING_KEY?.trim()),
    evidence_encryption_key_configured: Boolean(env.ABRAXAS_EVIDENCE_ENCRYPTION_KEY?.trim()),
    backup_encryption_key_configured: Boolean(env.ABRAXAS_BACKUP_ENCRYPTION_KEY?.trim()),
    supabase_env_present: Boolean(
      env.NEXT_PUBLIC_SUPABASE_URL?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
    restore_drill_authorized: env.ABRAXAS_SOVEREIGN_STAGING_RESTORE_DRILL_AUTHORIZED?.trim() === "true",
    migration_authorized: env.ABRAXAS_SOVEREIGN_MIGRATION_AUTHORIZED?.trim() === "true",
  };
}
