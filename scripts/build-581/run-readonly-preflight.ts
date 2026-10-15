#!/usr/bin/env npx tsx
// FILE: scripts/build-581/run-readonly-preflight.ts
// Run Build #578–#580 read-only probes against authorized Production Postgres (no secrets in output).

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { validatePassportHybridPostgresBinding } from "@/lib/persistence/passportHybridPostgres";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";

const PROBE_FILES = [
  "scripts/build-578/production-schema-probes.sql",
  "scripts/build-579/production-migration-preflight.sql",
  "scripts/build-580/production-migration-release-gates.sql",
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
  const report = {
    build: 581,
    generated_at: new Date().toISOString(),
    canonical_product_url: "https://abraxasworld.xyz",
    expected_production_ref: PRODUCTION_SUPABASE_PROJECT_REF,
    derived_database_ref: derivedRef,
    hybrid_binding: binding,
    probes: {} as Record<string, unknown>,
  };

  if (!binding.ok || derivedRef !== PRODUCTION_SUPABASE_PROJECT_REF) {
    console.log(JSON.stringify({ ...report, status: "blocked_database_identity" }, null, 2));
    process.exit(2);
  }

  for (const file of PROBE_FILES) {
    report.probes[file] = runProbe(databaseUrl, file);
  }

  console.log(JSON.stringify({ ...report, status: "ok" }, null, 2));
}

try {
  main();
} catch (error) {
  console.log(
    JSON.stringify(
      {
        build: 581,
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
