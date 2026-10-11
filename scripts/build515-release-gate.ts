#!/usr/bin/env npx tsx
/**
 * Build #515 release gate — schema-object truth vs migration history; no remote writes.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { assertDemoSupabaseNotProduction } from "@/lib/release/demoEnvironmentSafety";
import { auditMigrationFiles } from "@/lib/release/migrationSqlAudit";
import {
  evaluateDemoSolanaSchemaGate,
  formatDemoSolanaSchemaGateReport,
} from "@/lib/release/demoSolanaSchemaGate";
import { SOLANA_INCREMENTAL_MIGRATION_FILES } from "@/lib/release/solanaIncrementalMigrations";
import {
  formatSolanaNativeDemoPreflightReport,
  runSolanaNativeDemoPreflight,
} from "@/lib/integration/solanaNativeDemoPreflight";

const ROOT = resolve(__dirname, "..");
const DEMO_REF = "ocntwbxarpjeixdnzide";

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function liveSchemaProbe(): Promise<{
  tables: string[];
  columns: string[];
  policies: string[];
  latestMigrationName: string | null;
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const safety = assertDemoSupabaseNotProduction({ supabaseUrl: url });
  if (safety.verdict !== "pass") {
    throw new Error(safety.message);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const tables = [
    "holder_wallet_accounts",
    "holder_wallet_login_challenges",
    "holder_accounts",
    "decision_receipt_solana_commitments",
    "partner_policies",
    "identity_verifications",
    "decision_receipts",
    "partner_flow_continuations",
    "reusable_eligibility_facts",
  ];

  const tablesPresent: string[] = [];
  for (const table of tables) {
    const { error } = await sb.from(table).select("*", { head: true, count: "exact" });
    if (!error) tablesPresent.push(table);
  }

  const columnsPresent: string[] = [];
  const { error: idvColErr } = await sb
    .from("identity_verifications")
    .select("holder_account_id", { head: true, count: "exact" });
  if (!idvColErr) columnsPresent.push("identity_verifications.holder_account_id");

  const policyIds: string[] = [];
  const { data: policyRows } = await sb
    .from("partner_policies")
    .select("id")
    .in("id", ["cielo-verified-guest-solana-v1", "good-trouble-age_21_retail-solana-v1"]);
  if (policyRows) {
    for (const row of policyRows as { id: string }[]) {
      policyIds.push(row.id);
    }
  }

  return {
    tables: tablesPresent,
    columns: columnsPresent,
    policies: policyIds,
    latestMigrationName: null,
  };
}

async function main() {
  const sha = gitSha();
  console.log("=== Build #515 release gate ===");
  console.log(`commit=${sha}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const safety = assertDemoSupabaseNotProduction({ supabaseUrl: url || `https://${DEMO_REF}.supabase.co` });
  console.log(`demo_safety=${safety.verdict} ${safety.message}`);
  if (safety.isProductionRef) {
    console.error("\nSTOP-SHIP: production Supabase binding.");
    process.exit(3);
  }

  const sqlAudit = auditMigrationFiles(SOLANA_INCREMENTAL_MIGRATION_FILES);
  console.log(`\nsql_audit_134_138=${sqlAudit.pass ? "PASS" : "FAIL"}`);
  if (!sqlAudit.pass) process.exit(3);

  let gateReport = "";
  try {
    const probe = await liveSchemaProbe();
    if (probe) {
      const gate = evaluateDemoSolanaSchemaGate({
        tablesPresent: probe.tables,
        columnsPresent: probe.columns,
        policyIdsPresent: probe.policies,
        latestMigrationName: "087_stocklana_pilot",
      });
      gateReport = formatDemoSolanaSchemaGateReport(gate);
      console.log("\n--- Demo schema gate (live probe) ---");
      console.log(gateReport);
      if (gate.partialSolanaActivation) process.exit(4);
      if (gate.verdict === "blocked_missing_prerequisites") process.exit(5);
    } else {
      console.log("\n--- Demo schema gate ---");
      console.log("BLOCKED: set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for live catalog probe");
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  }

  const preflight = await runSolanaNativeDemoPreflight({
    env: process.env,
    tableExists: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? async (table) => {
          const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } },
          );
          const { error } = await sb.from(table).select("*", { head: true, count: "exact" });
          return !error;
        }
      : undefined,
  });
  console.log("\n--- Solana demo preflight ---");
  console.log(formatSolanaNativeDemoPreflightReport(preflight));

  const outPath = resolve(ROOT, "docs/BUILD_515_RELEASE_GATE_LAST_RUN.txt");
  writeFileSync(
    outPath,
    [
      `commit=${sha}`,
      `timestamp=${new Date().toISOString()}`,
      safety.message,
      "",
      gateReport || "(no live probe)",
      "",
      formatSolanaNativeDemoPreflightReport(preflight),
    ].join("\n"),
    "utf8",
  );
  console.log(`\nWrote ${outPath}`);

  const blocked = preflight.checks.some(c => c.status === "blocked");
  const fail = preflight.checks.some(c => c.status === "fail");
  process.exit(fail ? 1 : blocked ? 2 : 0);
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
