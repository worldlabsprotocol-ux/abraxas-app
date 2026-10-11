#!/usr/bin/env npx tsx
/**
 * Build #515 — offline migration dependency audit (088–138 focus, 134–138 SQL audit).
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditMigrationFiles } from "@/lib/release/migrationSqlAudit";
import {
  SOLANA_INCREMENTAL_MIGRATION_FILES,
  SOLANA_MIGRATION_GRAPH,
  SOLANA_PREREQUISITE_OBJECTS_FROM_EARLIER_MIGRATIONS,
} from "@/lib/release/solanaIncrementalMigrations";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

function migrationsInNumericRange(min: number, max: number): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .filter(f => {
      const n = Number.parseInt(f.split("_")[0] ?? "", 10);
      return !Number.isNaN(n) && n >= min && n <= max;
    })
    .sort((a, b) => Number.parseInt(a.split("_")[0]!, 10) - Number.parseInt(b.split("_")[0]!, 10));
}

function main() {
  console.log("=== Build #515 migration audit (offline) ===\n");

  const range088138 = migrationsInNumericRange(88, 138);
  console.log(`Migrations 088–138 in repo (${range088138.length} files):`);
  for (const f of range088138) console.log(`  ${f}`);

  console.log("\n--- Solana incremental prerequisite objects (from earlier migrations) ---");
  for (const row of SOLANA_PREREQUISITE_OBJECTS_FROM_EARLIER_MIGRATIONS) {
    console.log(`  ${row.object} ← ${row.provenance}`);
  }

  console.log("\n--- Solana incremental graph 134–138 ---");
  for (const node of SOLANA_MIGRATION_GRAPH) {
    console.log(`  ${node.file}`);
    console.log(`    creates: ${node.creates.join(", ") || "(none)"}`);
    console.log(`    alters: ${node.alters.join(", ") || "(none)"}`);
    console.log(`    seeds: ${node.seeds.join(", ") || "(none)"}`);
    console.log(`    requiresTables: ${node.requiresTables.join(", ") || "(none)"}`);
    console.log(`    destructiveRisk: ${node.destructiveRisk}`);
  }

  const audit = auditMigrationFiles(SOLANA_INCREMENTAL_MIGRATION_FILES);
  console.log("\n--- Static SQL audit (134–138) ---");
  console.log(`pass=${audit.pass}`);
  for (const f of audit.findings) {
    console.log(`  [${f.severity}] ${f.detail} (line ${f.line})`);
  }

  console.log("\n--- Minimal Demo catch-up sequence (when prerequisites exist) ---");
  console.log(SOLANA_INCREMENTAL_MIGRATION_FILES.join(" → "));

  console.log("\nNote: Demo schema_migrations may stop at 087 while ~65 public tables exist.");
  console.log("Do NOT replay 088–133 solely because history is behind; verify catalog objects.");

  process.exit(audit.pass ? 0 : 3);
}

main();
