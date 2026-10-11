// Solana incremental migrations 134–138 only — Demo apply with founder confirmation gate.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SOLANA_INCREMENTAL_MIGRATION_FILES } from "@/lib/release/solanaIncrementalMigrations";
import { auditMigrationFiles } from "@/lib/release/migrationSqlAudit";
import {
  assertApplyConfirmation,
  assertMigrationContentMatchesPlan,
  type DemoMigrationPlanEntry,
  sha256File,
} from "./demoMigrationRunner";
import {
  validateApplyDemoMigrationConfig,
  validateDryRunDemoMigrationConfig,
} from "./demoMigrationRunner";
import { maskProjectRef } from "./demoProjectGuard";
import { getMigrationTransactionMode } from "./demoMigrationTransactionAudit";
import {
  assertDatabaseLedgerCompatible,
  computeDemoMigrationAdvisoryLockKey,
  fetchDatabaseLedgerRow,
  initializeDemoOpsLedger,
  insertDatabaseLedgerRow,
  type DatabaseExecutor,
} from "./demoDatabaseLedger";
import { redactDatabaseSecrets } from "./demoDatabaseUrl";
import type { DemoMigrationApplyConfig, DemoMigrationDryRunConfig } from "./demoMigrationRunner";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

export function loadSolanaIncrementalPlan(): DemoMigrationPlanEntry[] {
  return SOLANA_INCREMENTAL_MIGRATION_FILES.map((file, index) => {
    const absolutePath = resolve(MIGRATIONS_DIR, file);
    if (!existsSync(absolutePath)) {
      throw new Error(`Solana incremental migration missing: ${file}`);
    }
    return {
      order: index + 1,
      file,
      absolutePath,
      sha256: sha256File(absolutePath),
      ledgerStatus: "pending",
      transactionMode: getMigrationTransactionMode(file),
    };
  });
}

export function buildSolanaIncrementalDryRunReport(config: DemoMigrationDryRunConfig) {
  const audit = auditMigrationFiles(SOLANA_INCREMENTAL_MIGRATION_FILES);
  if (!audit.pass) {
    throw new Error(
      `Static SQL audit failed for Solana incremental migrations: ${audit.findings.map(f => f.detail).join("; ")}`,
    );
  }
  return {
    mode: "dry-run" as const,
    scope: "solana-incremental-134-138",
    maskedProjectRef: maskProjectRef(config.demoProjectRef),
    maskedDatabaseTarget: config.maskedDatabaseTarget,
    migrations: loadSolanaIncrementalPlan(),
    sqlAuditPass: audit.pass,
  };
}

export function formatSolanaIncrementalDryRunReport(report: ReturnType<typeof buildSolanaIncrementalDryRunReport>): string {
  const lines = [
    "Demo Solana Incremental Migration Runner — DRY RUN",
    "================================================",
    `Scope: ${report.scope}`,
    `Target project: ${report.maskedProjectRef}`,
    `Database target: ${report.maskedDatabaseTarget}`,
    `Static SQL audit: ${report.sqlAuditPass ? "PASS" : "FAIL"}`,
    "",
    `Approved sequence (${report.migrations.length} files):`,
  ];
  for (const entry of report.migrations) {
    lines.push(
      `${entry.order}. ${entry.file}  sha256=${entry.sha256}  tx=${entry.transactionMode}`,
    );
  }
  lines.push("", "No database connection or SQL execution performed.");
  lines.push("Remote apply requires founder authorization and --apply --confirm=<DEMO_SUPABASE_PROJECT_REF>.");
  return lines.join("\n");
}

async function applySingleMigration(input: {
  client: DatabaseExecutor;
  entry: DemoMigrationPlanEntry;
  sql: string;
}): Promise<void> {
  await input.client.withTransaction(async (tx) => {
    await tx.query(input.sql);
    await insertDatabaseLedgerRow(tx, {
      filename: input.entry.file,
      sha256: input.entry.sha256,
    });
  });
}

export async function applySolanaIncrementalMigrations(input: {
  config: DemoMigrationApplyConfig;
  confirmation: string;
  env: Record<string, string | undefined>;
  createClient: (input: {
    databaseUrl: string;
    env: Record<string, string | undefined>;
  }) => Promise<DatabaseExecutor>;
}): Promise<{ applied: string[]; skipped: string[] }> {
  assertApplyConfirmation(input.confirmation, input.config.demoProjectRef);

  const audit = auditMigrationFiles(SOLANA_INCREMENTAL_MIGRATION_FILES);
  if (!audit.pass) {
    throw new Error("Refusing apply: static SQL audit reported destructive patterns");
  }

  const plan = loadSolanaIncrementalPlan();
  const applied: string[] = [];
  const skipped: string[] = [];
  const lockKey = computeDemoMigrationAdvisoryLockKey(`${input.config.demoProjectRef}:solana134`);

  const client = await input.createClient({
    databaseUrl: input.config.databaseUrl,
    env: input.env,
  });
  let lockHeld = false;
  try {
    lockHeld = await client.tryAdvisoryLock(lockKey);
    if (!lockHeld) {
      throw new Error("Another Solana incremental migration run holds the advisory lock");
    }

    await initializeDemoOpsLedger(client);

    for (const entry of plan) {
      const existing = await fetchDatabaseLedgerRow(client, entry.file);
      const action = assertDatabaseLedgerCompatible(existing, entry.file, entry.sha256);
      if (action === "skip") {
        skipped.push(entry.file);
        continue;
      }

      const sql = readFileSync(entry.absolutePath, "utf8");
      assertMigrationContentMatchesPlan(entry, sql);

      try {
        await applySingleMigration({ client, entry, sql });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          redactDatabaseSecrets(`Migration failed on ${entry.file}: ${message}`, input.env),
        );
      }
      applied.push(entry.file);
    }
  } finally {
    if (lockHeld) {
      await client.advisoryUnlock(lockKey);
    }
    await client.end();
  }

  return { applied, skipped };
}

export { validateDryRunDemoMigrationConfig, validateApplyDemoMigrationConfig };
