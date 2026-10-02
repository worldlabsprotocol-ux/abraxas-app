// FILE: lib/operations/scaleOperationsMigrations.ts
// Canonical scale-operations migration registry and schema probes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { probeTableExists } from "@/lib/goodTrouble/tableProbe";

export const SCALE_OPERATIONS_MIGRATION_ORDER = [
  "125_scale_operations_durable_state.sql",
  "126_zklogin_oauth_jti_consumed.sql",
] as const;

export type ScaleOperationsMigrationFile = (typeof SCALE_OPERATIONS_MIGRATION_ORDER)[number];

export const SCALE_OPERATIONS_MIGRATION_TABLES: Record<ScaleOperationsMigrationFile, readonly string[]> = {
  "125_scale_operations_durable_state.sql": [
    "provenance_flow_sessions",
    "provenance_content_submissions",
    "organization_eligibility_consents",
    "sandbox_readiness_runs",
  ],
  "126_zklogin_oauth_jti_consumed.sql": [
    "zklogin_oauth_jti_consumed",
  ],
};

const TABLE_PROBE_COLUMNS: Record<string, string> = {
  provenance_flow_sessions: "verification_request_id",
  provenance_content_submissions: "subject_id",
  organization_eligibility_consents: "consent_ref",
  sandbox_readiness_runs: "partner_id",
  zklogin_oauth_jti_consumed: "jti_hash",
};

export type ScaleOperationsSchemaSignal = "available" | "missing" | "unknown";

export interface ScaleOperationsSchemaProbe {
  migration: ScaleOperationsMigrationFile;
  tables: Array<{
    table: string;
    signal: ScaleOperationsSchemaSignal;
    detail: string;
  }>;
  signal: ScaleOperationsSchemaSignal;
}

function probeSignal(state: "exists" | "missing" | "unknown"): ScaleOperationsSchemaSignal {
  if (state === "exists") return "available";
  if (state === "missing") return "missing";
  return "unknown";
}

export async function probeScaleOperationsMigration(
  sb: SupabaseClient,
  migration: ScaleOperationsMigrationFile,
): Promise<ScaleOperationsSchemaProbe> {
  const tables = SCALE_OPERATIONS_MIGRATION_TABLES[migration];
  const rows: ScaleOperationsSchemaProbe["tables"] = [];

  for (const table of tables) {
    const column = TABLE_PROBE_COLUMNS[table] ?? "id";
    const probe = await probeTableExists(sb, table, { headColumn: column });
    rows.push({
      table,
      signal: probeSignal(probe.state),
      detail: probe.detail,
    });
  }

  const signal: ScaleOperationsSchemaSignal = rows.some((row) => row.signal === "missing")
    ? "missing"
    : rows.every((row) => row.signal === "available")
      ? "available"
      : "unknown";

  return { migration, tables: rows, signal };
}

export async function probeAllScaleOperationsMigrations(
  sb: SupabaseClient,
): Promise<ScaleOperationsSchemaProbe[]> {
  const probes: ScaleOperationsSchemaProbe[] = [];
  for (const migration of SCALE_OPERATIONS_MIGRATION_ORDER) {
    probes.push(await probeScaleOperationsMigration(sb, migration));
  }
  return probes;
}
