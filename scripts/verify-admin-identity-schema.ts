#!/usr/bin/env npx tsx
// FILE: scripts/verify-admin-identity-schema.ts
// Verify admin identity review queries match live Supabase schema (zero mismatch gate).

import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_WORKFLOW_COLUMN_USAGE,
  IDENTITY_BIOMETRIC_ASSESSMENTS_COLUMNS,
  IDENTITY_REVIEW_AUDIT_LOG_COLUMNS,
  IDENTITY_VERIFICATIONS_ADMIN_COLUMNS,
  MIGRATION_COLUMN_SOURCES,
  PASSPORT_DOCUMENTS_COLUMNS,
} from "../lib/idv/adminIdentitySchema";

const TABLES: Record<string, readonly string[]> = {
  passport_documents: PASSPORT_DOCUMENTS_COLUMNS,
  identity_biometric_assessments: IDENTITY_BIOMETRIC_ASSESSMENTS_COLUMNS,
  identity_review_audit_log: IDENTITY_REVIEW_AUDIT_LOG_COLUMNS,
  identity_verifications: IDENTITY_VERIFICATIONS_ADMIN_COLUMNS,
};

async function probeSelect(
  table: string,
  columns: readonly string[],
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { ok: false, error: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY unset" };
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const select = columns.join(", ");
  const { error } = await sb.from(table).select(select).limit(0);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function main() {
  console.log("=== Admin identity schema audit ===\n");

  console.log("Column provenance (not all from 050):");
  for (const [col, migration] of Object.entries(MIGRATION_COLUMN_SOURCES)) {
    console.log(`  ${col} ← ${migration}`);
  }
  console.log("");

  let allOk = true;

  for (const [table, columns] of Object.entries(TABLES)) {
    const result = await probeSelect(table, columns);
    if (result.ok) {
      console.log(`✓ ${table} (${columns.length} columns)`);
    } else {
      allOk = false;
      console.log(`✗ ${table}: ${result.error}`);
    }
  }

  console.log("\nWorkflow query column probes:");
  for (const [step, columns] of Object.entries(ADMIN_WORKFLOW_COLUMN_USAGE)) {
    const table = step.startsWith("queue_biometric") || step.includes("biometric")
      ? "identity_biometric_assessments"
      : step.startsWith("audit")
        ? "identity_review_audit_log"
        : "passport_documents";

    const result = await probeSelect(table, columns);
    if (result.ok) {
      console.log(`  ✓ ${step}`);
    } else {
      allOk = false;
      console.log(`  ✗ ${step}: ${result.error}`);
    }
  }

  console.log(allOk
    ? "\n✓ Schema matches admin workflow queries"
    : "\n✗ Schema mismatch — apply missing migrations before production");
  process.exit(allOk ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
