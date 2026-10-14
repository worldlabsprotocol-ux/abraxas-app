#!/usr/bin/env npx tsx
/**
 * Apply portable sovereign schema — requires explicit migration authorization.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SOVEREIGN_RUNTIME_SCHEMA_MANIFEST } from "../../lib/databaseRecovery/sovereignSchemaManifest";
import { assertSovereignMigrationAuthorized } from "../../lib/sovereignRuntime/sovereignActivationPolicy";

const env = process.env;
const migrationErrors = assertSovereignMigrationAuthorized(env);
if (migrationErrors.length > 0) {
  console.error(JSON.stringify({ error: "migration_refused", issues: migrationErrors }, null, 2));
  process.exit(1);
}

const pgUrl = env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  ?? env.MIGRATION_136_PG_URL?.trim()
  ?? env.ABRAXAS_DATABASE_URL?.trim();

if (!pgUrl) {
  console.error("Set ABRAXAS_DATABASE_URL or MIGRATION_136_PG_URL");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "supabase/migrations");
const files = [...SOVEREIGN_RUNTIME_SCHEMA_MANIFEST];

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  console.log(`Applying ${file}…`);
  execFileSync("psql", [pgUrl, "-v", "ON_ERROR_STOP=0"], { input: sql, encoding: "utf8" });
}

console.log("Sovereign IDV schema apply complete.");
