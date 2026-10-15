#!/usr/bin/env npx tsx
// FILE: scripts/build-581/run-readonly-preflight.ts

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  PRODUCTION_PREFLIGHT_ENVELOPE_BUILD,
  PRODUCTION_PREFLIGHT_ENVELOPE_VERSION,
  PRODUCTION_PREFLIGHT_PROBE_580_KEY,
  validateProductionPreflightEnvelope,
} from "@/lib/passport/productionPreflightEnvelope";
import { validatePassportHybridPostgresBinding } from "@/lib/persistence/passportHybridPostgres";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";

const PROBE_FILES = [
  "scripts/build-578/production-schema-probes.sql",
  "scripts/build-579/production-migration-preflight.sql",
  PRODUCTION_PREFLIGHT_PROBE_580_KEY,
] as const;

function resolveDatabaseUrl(): string {
  const url =
    process.env.ABRAXAS_PRODUCTION_READONLY_PG_URL?.trim()
    || process.env.ABRAXAS_PASSPORT_DATABASE_URL?.trim()
    || process.env.ABRAXAS_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("missing_readonly_database_url");
  }
  return url;
}

function runProbe(url: string, relativePath: string): unknown {
  const path = join(process.cwd(), relativePath);
  const out = execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-f", path], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
  const start = out.indexOf("{");
  if (start < 0) throw new Error(`probe_missing_json:${relativePath}`);
  return JSON.parse(out.slice(start));
}

function main() {
  const databaseUrl = resolveDatabaseUrl();
  const env = {
    ...process.env,
    ABRAXAS_PASSPORT_DATABASE_URL: databaseUrl,
    ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
    ABRAXAS_PASSPORT_TRANSACTION_PG: "true",
    ABRAXAS_PASSPORT_HYBRID_PRODUCTION_AUTHORIZED: "true",
    ABRAXAS_PASSPORT_SUPABASE_PROJECT_REF: PRODUCTION_SUPABASE_PROJECT_REF,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      || `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
  };

  const binding = validatePassportHybridPostgresBinding(env);
  const derivedRef = supabaseProjectRefFromPostgresUrl(databaseUrl);
  const probes: Record<string, unknown> = {};

  if (!binding.ok || derivedRef !== PRODUCTION_SUPABASE_PROJECT_REF) {
    console.log(
      JSON.stringify(
        {
          build: PRODUCTION_PREFLIGHT_ENVELOPE_BUILD,
          envelope_version: PRODUCTION_PREFLIGHT_ENVELOPE_VERSION,
          status: "blocked_database_identity",
          generated_at: new Date().toISOString(),
          expected_production_ref: PRODUCTION_SUPABASE_PROJECT_REF,
          derived_database_ref: derivedRef,
          hybrid_binding: binding,
          probes,
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  for (const file of PROBE_FILES) {
    probes[file] = runProbe(databaseUrl, file);
  }

  const releaseGatesReport = probes[PRODUCTION_PREFLIGHT_PROBE_580_KEY];
  const envelope = {
    build: PRODUCTION_PREFLIGHT_ENVELOPE_BUILD,
    envelope_version: PRODUCTION_PREFLIGHT_ENVELOPE_VERSION,
    status: "ok" as const,
    generated_at: new Date().toISOString(),
    canonical_product_url: "https://abraxasworld.xyz",
    expected_production_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    derived_database_ref: derivedRef,
    hybrid_binding: {
      ok: true as const,
      binding_mode: binding.binding_mode,
      direct_project_ref: binding.direct_project_ref,
      postgrest_project_ref: binding.postgrest_project_ref,
    },
    probes,
    release_gates_report: releaseGatesReport,
  };

  const validated = validateProductionPreflightEnvelope(envelope);
  if (!validated.ok) {
    console.log(JSON.stringify({ ...envelope, status: "invalid_envelope", validation: validated }, null, 2));
    process.exit(2);
  }

  console.log(JSON.stringify(envelope, null, 2));
}

try {
  main();
} catch (error) {
  console.log(
    JSON.stringify(
      {
        build: PRODUCTION_PREFLIGHT_ENVELOPE_BUILD,
        status: "blocked",
        code: error instanceof Error ? error.message : "preflight_failed",
        operator_requirement:
          "Provide read-only Postgres URL via ABRAXAS_PRODUCTION_READONLY_PG_URL (session role limited to SELECT on information_schema and aggregate counts).",
      },
      null,
      2,
    ),
  );
  process.exit(2);
}
