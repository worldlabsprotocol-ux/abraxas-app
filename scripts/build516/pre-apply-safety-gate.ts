#!/usr/bin/env npx tsx
/**
 * Build #516 hard-stop gate — no remote writes. Exits non-zero if apply must not proceed.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { assertDemoSupabaseNotProduction } from "@/lib/release/demoEnvironmentSafety";
import { evaluateDemoSolanaSchemaGate } from "@/lib/release/demoSolanaSchemaGate";
import { auditMigrationFiles } from "@/lib/release/migrationSqlAudit";
import { SOLANA_INCREMENTAL_MIGRATION_FILES } from "@/lib/release/solanaIncrementalMigrations";

const DEMO_REF = "ocntwbxarpjeixdnzide";
const PRODUCTION_REF = "bztwutzprwsdrtqdpymf";
const MANIFEST_PATH = resolve(process.cwd(), "scripts/build516/migration-checksum-manifest.json");

function sha256File(rel: string): string {
  const content = readFileSync(resolve(process.cwd(), "supabase/migrations", rel), "utf8");
  return createHash("sha256").update(content).digest("hex");
}

function main() {
  console.log("=== Build #516 pre-apply safety gate (offline) ===");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const safety = assertDemoSupabaseNotProduction({
    supabaseUrl: url || `https://${DEMO_REF}.supabase.co`,
    projectRef: process.env.DEMO_SUPABASE_PROJECT_REF,
  });
  console.log(`demo_safety=${safety.verdict} ${safety.message}`);
  if (safety.isProductionRef || safety.observedRef === PRODUCTION_REF) {
    console.error("STOP: production target");
    process.exit(3);
  }
  if (safety.observedRef && safety.observedRef !== DEMO_REF) {
    console.error(`STOP: target ref ${safety.observedRef} is not ${DEMO_REF}`);
    process.exit(3);
  }

  const rehearsalVerdict = process.env.BUILD516_DISPOSABLE_REHEARSAL_VERDICT?.trim();
  if (rehearsalVerdict !== "PASS") {
    console.error("STOP: disposable PostgreSQL rehearsal not PASS (set BUILD516_DISPOSABLE_REHEARSAL_VERDICT=PASS after rehearsal)");
    process.exit(4);
  }

  const recoveryVerified = process.env.BUILD516_DEMO_RECOVERY_VERIFIED?.trim();
  if (recoveryVerified !== DEMO_REF) {
    console.error(
      "STOP: Demo recovery point not verified. Operator must confirm Supabase backup/PITR in dashboard, then set BUILD516_DEMO_RECOVERY_VERIFIED=ocntwbxarpjeixdnzide",
    );
    process.exit(5);
  }

  const audit = auditMigrationFiles(SOLANA_INCREMENTAL_MIGRATION_FILES);
  if (!audit.pass) {
    console.error("STOP: SQL audit failed");
    process.exit(6);
  }

  for (const file of SOLANA_INCREMENTAL_MIGRATION_FILES) {
    const hash = sha256File(file);
    console.log(`checksum ${file}=${hash}`);
  }

  const gate = evaluateDemoSolanaSchemaGate({
    tablesPresent: (process.env.BUILD516_PROBE_TABLES ?? "").split(",").filter(Boolean),
    columnsPresent: (process.env.BUILD516_PROBE_COLUMNS ?? "").split(",").filter(Boolean),
    policyIdsPresent: (process.env.BUILD516_PROBE_POLICIES ?? "").split(",").filter(Boolean),
    latestMigrationName: process.env.BUILD516_LATEST_MIGRATION_NAME ?? "087_stocklana_pilot",
  });

  if (gate.partialSolanaActivation) {
    console.error("STOP: partial Solana schema on target");
    process.exit(7);
  }
  if (!gate.readyForIncrementalApply && !process.env.BUILD516_FORCE_SCHEMA_GATE) {
    console.error("STOP: schema gate not ready for incremental apply");
    process.exit(8);
  }

  if (!process.env.DEMO_SUPABASE_DATABASE_URL?.trim()) {
    console.error("STOP: DEMO_SUPABASE_DATABASE_URL required for apply tooling");
    process.exit(9);
  }

  console.log("GATE_PASS: prerequisites satisfied for controlled apply tooling");
  process.exit(0);
}

main();
