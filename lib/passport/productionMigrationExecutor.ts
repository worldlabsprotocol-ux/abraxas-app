// FILE: lib/passport/productionMigrationExecutor.ts

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PoolClient } from "pg";
import {
  evaluateProductionMigration581,
  PRODUCTION_MIGRATION_EXECUTION_NONCE_ENV,
  verifyProductionDdlExecutionAuthorization,
  verifyProductionMigrationExecutionNonce,
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
  outcome: "applied" | "skipped_already_applied";
  detail?: string;
};

export type MigrationExecutionResult =
  | { ok: true; records: MigrationExecutionRecord[]; evidence_trail_id: string }
  | { ok: false; code: string; detail: string; failed_file?: string; failed_sha256?: string };

export class ProductionMigrationGateError extends Error {
  readonly code: string;

  constructor(code: string, detail: string) {
    super(detail);
    this.code = code;
  }
}

export class ProductionMigrationStepError extends Error {
  readonly code = "migration_step_failed" as const;
  readonly failedFile: string;
  readonly failedSha256: string;
  readonly sanitizedDetail: string;
  readonly attemptedRecords: MigrationExecutionRecord[];

  constructor(input: {
    failedFile: string;
    failedSha256: string;
    sanitizedDetail: string;
    attemptedRecords: MigrationExecutionRecord[];
  }) {
    super(`Migration failed on ${input.failedFile}`);
    this.failedFile = input.failedFile;
    this.failedSha256 = input.failedSha256;
    this.sanitizedDetail = sanitizeMigrationErrorDetail(input.sanitizedDetail);
    this.attemptedRecords = input.attemptedRecords;
  }
}

function sanitizeMigrationErrorDetail(detail: string): string {
  return detail
    .replace(/postgresql:\/\/[^\s]+/gi, "[redacted-connection-string]")
    .slice(0, 500);
}

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

/** Runs inside an open transaction; throws on gate or SQL failure to force ROLLBACK. */
export async function executeControlledProductionMigrations(input: {
  client: PoolClient;
  env?: Record<string, string | undefined>;
  executionNonce: string;
  dryRun?: boolean;
  plan?: { file: string; sha256: string; sql: string }[];
}): Promise<MigrationExecutionResult> {
  const env = input.env ?? process.env;
  const preflightLoaded = loadProductionPreflightEvidence(env);
  if (!preflightLoaded.ok) {
    throw new ProductionMigrationGateError(preflightLoaded.code, preflightLoaded.detail);
  }
  if (preflightLoaded.evidence.stale) {
    throw new ProductionMigrationGateError("preflight_stale", "Preflight evidence is stale; refresh read-only probes.");
  }

  const binding = await assertReconciliationDatabaseBinding({ client: input.client, env });
  if (!binding.ok) {
    throw new ProductionMigrationGateError(binding.code, binding.detail);
  }
  if (binding.derivedProjectRef !== PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new ProductionMigrationGateError(
      "migration_target_mismatch",
      "Active database identity is not Production project ref.",
    );
  }

  const evaluation = evaluateProductionMigration581({
    preflight: preflightLoaded.evidence.report,
    preflightEvidence: preflightLoaded.evidence,
    env,
    verifiedDatabaseProjectRef: binding.derivedProjectRef,
  });
  if (evaluation.production_execution_blocked) {
    throw new ProductionMigrationGateError("phase_b_blocked", "Release gates block Production DDL execution.");
  }

  const ddlAuth = verifyProductionDdlExecutionAuthorization(env);
  if (!ddlAuth.ok) {
    throw new ProductionMigrationGateError(ddlAuth.code, ddlAuth.detail);
  }

  const nonceCheck = verifyProductionMigrationExecutionNonce(env, input.executionNonce);
  if (!nonceCheck.ok) {
    throw new ProductionMigrationGateError(nonceCheck.code, nonceCheck.detail);
  }

  const plan = input.plan ?? buildMigrationExecutionPlan();
  const records: MigrationExecutionRecord[] = [];
  const evidenceTrailId = createHash("sha256")
    .update(`${binding.derivedProjectRef}:${Date.now()}:${plan.map((p) => p.sha256).join(",")}`)
    .digest("hex")
    .slice(0, 16);

  const appliedRecords = await executeMigrationPlanWithAdvisoryLock({
    client: input.client,
    plan,
    dryRun: input.dryRun,
  });
  records.push(...appliedRecords);

  return { ok: true, records, evidence_trail_id: evidenceTrailId };
}

/** Transaction-local migration steps; throws ProductionMigrationStepError to force ROLLBACK. */
export async function executeMigrationPlanWithAdvisoryLock(input: {
  client: PoolClient;
  plan: { file: string; sha256: string; sql: string }[];
  dryRun?: boolean;
}): Promise<MigrationExecutionRecord[]> {
  const records: MigrationExecutionRecord[] = [];
  await input.client.query(`select pg_advisory_xact_lock(581001, 581143)`);

  for (const step of input.plan) {
    if (input.dryRun) {
      records.push({ file: step.file, sha256: step.sha256, outcome: "skipped_already_applied", detail: "dry_run" });
      continue;
    }
    try {
      await input.client.query(step.sql);
    } catch (error) {
      const sanitizedDetail = error instanceof Error ? error.message : "migration_failed";
      throw new ProductionMigrationStepError({
        failedFile: step.file,
        failedSha256: step.sha256,
        sanitizedDetail,
        attemptedRecords: records,
      });
    }
    records.push({ file: step.file, sha256: step.sha256, outcome: "applied" });
  }

  return records;
}

export function migrationExecutorErrorToResult(error: unknown): MigrationExecutionResult {
  if (error instanceof ProductionMigrationStepError) {
    return {
      ok: false,
      code: error.code,
      detail: error.sanitizedDetail,
      failed_file: error.failedFile,
      failed_sha256: error.failedSha256,
    };
  }
  if (error instanceof ProductionMigrationGateError) {
    return { ok: false, code: error.code, detail: error.message };
  }
  return {
    ok: false,
    code: "execution_failed",
    detail: error instanceof Error ? error.message : "Reconciliation execution failed.",
  };
}
