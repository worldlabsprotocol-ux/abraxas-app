#!/usr/bin/env npx tsx
// FILE: scripts/build-581/run-migration-rehearsal.ts
// Disposable PostgreSQL rehearsal for migrations 136–143 (no Production DDL).

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { SOVEREIGN_PASSPORT_MIGRATION_FILES } from "@/lib/passport/productionMigrationRelease";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim();

function psql(url: string, sql: string): string {
  return execFileSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-t", "-A"], {
    input: sql,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function main() {
  if (!PG_URL) {
    console.log(JSON.stringify({ build: 581, status: "blocked", reason: "missing_disposable_postgresql_url" }, null, 2));
    process.exit(2);
  }

  const dbName = `abx_b581_rehearsal_${Date.now()}`;
  const admin = PG_URL.replace(/\/[^/]+$/, "/postgres");
  execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `create database "${dbName}"`]);
  const dbUrl = PG_URL.replace(/\/[^/]+$/, `/${dbName}`);

  const checksums: Record<string, string> = {};
  try {
    psql(dbUrl, readFileSync(join(process.cwd(), "scripts/build-580/disposable-production-legacy-fixture.sql"), "utf8"));
    for (const file of SOVEREIGN_PASSPORT_MIGRATION_FILES) {
      const sql = readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8");
      checksums[file] = createHash("sha256").update(sql, "utf8").digest("hex");
      psql(dbUrl, sql);
    }
    const postCheck = psql(
      dbUrl,
      `select jsonb_build_object(
         'passport_holder_subjects', exists (select 1 from information_schema.tables where table_name='passport_holder_subjects'),
         'passport_reusable_credentials', exists (select 1 from information_schema.tables where table_name='passport_reusable_credentials'),
         'identity_verifications_holder_subject_id', exists (
           select 1 from information_schema.columns where table_name='identity_verifications' and column_name='holder_subject_id'
         )
       )::text;`,
    );
    const parsed = JSON.parse(postCheck);
    console.log(
      JSON.stringify(
        {
          build: 581,
          status: "ok",
          disposable_database: dbName,
          migration_checksums: checksums,
          post_migration_schema_check: parsed,
          production_gate_sql_note:
            "Run scripts/build-580/production-migration-release-gates.sql on Production (includes supabase_migrations).",
          rehearsal_attestation_env: "ABRAXAS_PRODUCTION_MIGRATION_REHEARSAL_ATTESTED=true",
        },
        null,
        2,
      ),
    );
  } finally {
    execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists "${dbName}" with (force)`]);
  }
}

main();
