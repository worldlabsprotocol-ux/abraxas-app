#!/usr/bin/env npx tsx
// FILE: scripts/build-571/staging-readiness-audit.ts
// Founder controlled staging readiness baseline (no secrets in output).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import {
  buildStagingReadiness571,
  STAGING_INSTITUTION_PARTNER_IDS_ENV,
  STAGING_RECEIPT_CONSUMPTION_DIR_ENV,
  summarizeReadinessPhases,
  type StagingPolicyProbe,
} from "@/lib/passport/stagingReadiness571";
import { redactDatabaseConnectionLabel } from "@/lib/passport/stagingReadiness571Redact";
import { loadStagingExecutionEvidenceFromEnv } from "@/lib/passport/stagingExecutionEvidence";
import { loadPassportCredentialSigningKey } from "@/lib/passport/reusableCredential/passportCredentialSigning";

function pgUrl(): string | null {
  return (
    process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
    ?? process.env.ABRAXAS_DATABASE_URL?.trim()
    ?? null
  );
}

function psqlQuery(sql: string): string | null {
  const url = pgUrl();
  if (!url) return null;
  try {
    return execFileSync("psql", [url, "-tAc", sql], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function tableExists(table: string): boolean {
  const out = psqlQuery(`select to_regclass('public.${table}') is not null`);
  return out === "t";
}

function columnExists(table: string, column: string): boolean {
  const out = psqlQuery(
    `select exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = '${table}' and column_name = '${column}'
     )`,
  );
  return out === "t";
}

function pgConnectivityVerified(): boolean {
  const out = psqlQuery("select 1");
  return out === "1";
}

function probePolicies(): StagingPolicyProbe | null {
  const activeCountRaw = psqlQuery(`select count(*)::text from public.partner_policies where status = 'active'`);
  const distinctRaw = psqlQuery(
    `select count(distinct partner_id)::text from public.partner_policies where status = 'active'`,
  );
  if (activeCountRaw === null || distinctRaw === null) return null;
  const active_policy_count = Number.parseInt(activeCountRaw, 10);
  const active_distinct_partners = Number.parseInt(distinctRaw, 10);
  const requiredRaw = process.env[STAGING_INSTITUTION_PARTNER_IDS_ENV]?.trim();
  const required_partner_ids = requiredRaw
    ? requiredRaw.split(",").map((id) => id.trim()).filter(Boolean)
    : [];
  const missing_partner_ids: string[] = [];
  for (const partnerId of required_partner_ids) {
    const exists = psqlQuery(
      `select exists (
         select 1 from public.partner_policies where status = 'active' and partner_id = '${partnerId.replace(/'/g, "''")}'
       )`,
    );
    if (exists !== "t") missing_partner_ids.push(partnerId);
  }
  return {
    active_policy_count: Number.isFinite(active_policy_count) ? active_policy_count : 0,
    active_distinct_partners: Number.isFinite(active_distinct_partners) ? active_distinct_partners : 0,
    required_partner_ids,
    missing_partner_ids,
  };
}

function main() {
  const env = process.env as Record<string, string | undefined>;
  const executionEvidence = loadStagingExecutionEvidenceFromEnv(env, (path) => readFileSync(path, "utf8"));
  const checkpointDir = env.ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_DIR?.trim();
  const consumptionDir = env[STAGING_RECEIPT_CONSUMPTION_DIR_ENV]?.trim();

  const reportCore = buildStagingReadiness571({
    env,
    productionBuildPresent: existsSync(join(process.cwd(), ".next/BUILD_ID")),
    tableExists,
    columnExists,
    pgConnectivityVerified: pgConnectivityVerified(),
    credentialSigningMaterialAvailable: loadPassportCredentialSigningKey() !== null,
    receiptSigningMaterialAvailable: loadReceiptSigningKey() !== null,
    executionEvidence,
    policyProbe: probePolicies(),
    checkpointDirConfigured: Boolean(checkpointDir && existsSync(checkpointDir)),
    receiptConsumptionDirConfigured: Boolean(consumptionDir && existsSync(consumptionDir)),
  });

  const report = {
    build: 571,
    generated_at: new Date().toISOString(),
    database: pgUrl() ? redactDatabaseConnectionLabel(pgUrl()!) : null,
    execution_evidence: executionEvidence.ok ? "present" : executionEvidence.code,
    items: reportCore.items,
    failure_codes: reportCore.failure_codes,
    phase_summary: summarizeReadinessPhases(reportCore.items),
    activation_ready: reportCore.activation_ready,
    browser_auth_note:
      "Browser authentication remains configuration_validated until founder execution evidence records an authenticated session.",
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(reportCore.activation_ready ? 0 : 2);
}

main();
