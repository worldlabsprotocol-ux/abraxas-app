// FILE: lib/passport/productionMigrationExecutor.ts
// Controlled Production migration executor (Phase B only; never auto-run).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PoolClient } from "pg";
import {
  evaluateProductionMigration581,
  PRODUCTION_MIGRATION_EXECUTION_NONCE_ENV,
  verifyProductionDdlExecutionAuthorization,
} from "./productionMigration581";
import { loadProductionPreflightEvidence } from "./productionPreflightEvidence";
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  SOVEREIGN_PASSPORT_MIGRATION_FILES,
} from "./productionMigrationRelease";
import { assertReconciliationDatabaseBinding } from "./reconciliationDatabaseBinding";

export type MigrationExecutionRecord = {
  file: string;
  sha256: string;
  outcome: "applied" | "skipped_already_applied" | "failed";
  detail?: string;
};

export type MigrationExecutionResult =
  | { ok: true; records: MigrationExecutionRecord[]; evidence_trail_id: string }
  | { ok: false; code: string; detail: string };

function migrationChecksum(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

export function buildMigrationExecutionPlan(): { file: string; sha256: string; sql: string }[] {
  return SOVEREIGN_PASSPORT_MIGRATION_FILES.map((file) => {
    const path = join(process.cwd(), "supabase/migrations", file);
    const sql = readFileSync(path, "utf8");
    return { file, sha256: migrationChecksum(sql), sql };
  });
}

export async function executeControlledProductionMigrations(input: {
  client: PoolClient;
  env?: Record<string, string | undefined>;
  executionNonce: string;
  dryRun?: boolean;
}): Promise<MigrationExecutionResult> {
  const env = input.env ?? process.env;
  const preflightLoaded = loadProductionPreflightEvidence(env);
  if (!preflightLoaded.ok) {
    return { ok: false, code: preflightLoaded.code, detail: preflightLoaded.detail };
  }

  const binding = await assertReconciliationDatabaseBinding({ client: input.client, env });
  if (!binding.ok) {
    return { ok: false, code: binding.code, detail: binding.detail };
  }
  if (binding.derivedProjectRef !== PRODUCTION_SUPABASE_PROJECT_REF) {
    return {
      ok: false,
      code: "migration_target_mismatch",
      detail: "Active database identity is not Production project ref.",
    };
  }

  const evaluation = evaluateProductionMigration581({
    preflight: preflightLoaded.evidence.report,
    preflightEvidence: preflightLoaded.evidence,
    env,
    verifiedDatabaseProjectRef: binding.derivedProjectRef,
  });
  if (evaluation.production_execution_blocked) {
    return {
      ok: false,
      code: "phase_b_blocked",
      detail: "Release gates block Production DDL execution.",
    };
  }

  const ddlAuth = verifyProductionDdlExecutionAuthorization(env);
  if (!ddlAuth.ok) {
    return { ok: false, code: ddlAuth.code, detail: ddlAuth.detail };
  }

  const expectedNonce = env[PRODUCTION_MIGRATION_EXECUTION_NONCE_ENV]?.trim();
  if (!expectedNonce || expectedNonce !== input.executionNonce.trim()) {
    return { ok: false, code: "execution_nonce_mismatch", detail: "Single-use execution nonce mismatch." };
  }

  const plan = buildMigrationExecutionPlan();
  const records: MigrationExecutionRecord[] = [];
  const evidenceTrailId = createHash("sha256")
    .update(`${binding.derivedProjectRef}:${Date.now()}:${plan.map((p) => p.sha256).join(",")}`)
    .digest("hex")
    .slice(0, 16);

  await input.client.query(`select pg_advisory_xact_lock(581001, 581143)`);

  for (const step of plan) {
    if (input.dryRun) {
      records.push({ file: step.file, sha256: step.sha256, outcome: "skipped_already_applied", detail: "dry_run" });
      continue;
    }
    try {
      await input.client.query(step.sql);
      records.push({ file: step.file, sha256: step.sha256, outcome: "applied" });
    } catch (error) {
      records.push({
        file: step.file,
        sha256: step.sha256,
        outcome: "failed",
        detail: error instanceof Error ? error.message : "migration_failed",
      });
      return { ok: false, code: "migration_step_failed", detail: `Failed on ${step.file}` };
    }
  }

  return { ok: true, records, evidence_trail_id: evidenceTrailId };
}
