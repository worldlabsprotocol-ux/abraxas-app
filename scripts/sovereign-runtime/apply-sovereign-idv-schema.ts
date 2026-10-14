#!/usr/bin/env npx tsx
/**
 * Apply portable sovereign schema on disposable PostgreSQL (no Supabase APIs).
 * Order: holder subjects (136) → IDV activation manifest → evidence custody (138).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_IDV_ACTIVATION_MANIFEST } from "../../lib/databaseRecovery/idvActivationManifest";

const pgUrl = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  ?? process.env.MIGRATION_136_PG_URL?.trim()
  ?? process.env.ABRAXAS_DATABASE_URL?.trim();

if (!pgUrl) {
  console.error("Set ABRAXAS_DATABASE_URL or MIGRATION_136_PG_URL");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "supabase/migrations");
const files = [
  "006_abraxas_id.sql",
  "020_identity_verification_state_machine.sql",
  "136_passport_holder_subjects.sql",
  ...DEMO_IDV_ACTIVATION_MANIFEST,
  "138_sovereign_idv_evidence_custody.sql",
];

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  console.log(`Applying ${file}…`);
  execFileSync("psql", [pgUrl, "-v", "ON_ERROR_STOP=0"], { input: sql, encoding: "utf8" });
}

console.log("Sovereign IDV schema apply complete.");
