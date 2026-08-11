// FILE: scripts/demo/lib/demoMigrationRunner.ts
// Manifest-scoped demo migration runner — dry-run offline by default.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEMO_EXCLUDED_MIGRATIONS,
  DEMO_REQUIRED_MIGRATION_ORDER,
} from "./demoMigrationManifest";
import {
  assertDatabaseUrlMatchesDemoRef,
  DemoDatabaseUrlError,
  maskDatabaseUrl,
  maskDatabaseUrlFromProjectRef,
  redactDatabaseSecrets,
} from "./demoDatabaseUrl";
import {
  assertDatabaseLedgerCompatible,
  computeDemoMigrationAdvisoryLockKey,
  fetchDatabaseLedgerRow,
  initializeDemoOpsLedger,
  insertDatabaseLedgerRow,
  type DatabaseExecutor,
} from "./demoDatabaseLedger";
import { normalize055MigrationForAtomicExecution } from "./demoMigration055Normalization";
import { hashMigrationContent } from "./demoMigrationLedger";
import { getMigrationTransactionMode } from "./demoMigrationTransactionAudit";
import {
  maskProjectRef,
  validateReadOnlyDemoConfig,
} from "./demoProjectGuard";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

export interface DemoMigrationPlanEntry {
  order: number;
  file: string;
  absolutePath: string;
  sha256: string;
  ledgerStatus: "pending" | "applied";
  transactionMode: ReturnType<typeof getMigrationTransactionMode>;
}

export interface DemoMigrationDryRunConfig {
  demoProjectRef: string;
  productionProjectRef: string;
  maskedSupabaseUrl: string;
  maskedDatabaseTarget: string;
}

export interface DemoMigrationApplyConfig extends DemoMigrationDryRunConfig {
  databaseUrl: string;
}

export interface DemoMigrationDryRunReport {
  mode: "dry-run";
  maskedProjectRef: string;
  maskedDatabaseTarget: string;
  migrations: DemoMigrationPlanEntry[];
}

export interface DemoMigrationApplyReport {
  mode: "apply";
  maskedProjectRef: string;
  applied: string[];
  skipped: string[];
}

export function sha256File(path: string): string {
  const content = readFileSync(path, "utf8");
  return hashMigrationContent(content);
}

export function loadRequiredMigrationPlan(): DemoMigrationPlanEntry[] {
  return DEMO_REQUIRED_MIGRATION_ORDER.map((file, index) => {
    const absolutePath = resolve(MIGRATIONS_DIR, file);
    if (!existsSync(absolutePath)) {
      throw new Error(`Required migration file missing: ${file}`);
    }
    const sha256 = sha256File(absolutePath);
    return {
      order: index + 1,
      file,
      absolutePath,
      sha256,
      ledgerStatus: "pending",
      transactionMode: getMigrationTransactionMode(file),
    };
  });
}

export function assertMigrationFileAllowed(file: string): void {
  if ((DEMO_EXCLUDED_MIGRATIONS as readonly string[]).includes(file)) {
    throw new Error(`Migration file is explicitly excluded from demo bootstrap: ${file}`);
  }

  if (!(DEMO_REQUIRED_MIGRATION_ORDER as readonly string[]).includes(file)) {
    throw new Error(`Migration file is outside the approved demo manifest: ${file}`);
  }
}

export function rejectOutOfManifestDiscovery(): void {
  const manifestSet = new Set(DEMO_REQUIRED_MIGRATION_ORDER);
  const excludedSet = new Set(DEMO_EXCLUDED_MIGRATIONS);
  const discovered = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql"));

  for (const file of discovered) {
    if (excludedSet.has(file as (typeof DEMO_EXCLUDED_MIGRATIONS)[number])) {
      continue;
    }
    if (!manifestSet.has(file as (typeof DEMO_REQUIRED_MIGRATION_ORDER)[number])) {
      continue;
    }
  }
}

/** Offline dry-run validation — no database URL required. */
export function validateDryRunDemoMigrationConfig(
  env: Record<string, string | undefined>,
): DemoMigrationDryRunConfig {
  const guard = validateReadOnlyDemoConfig(env);
  return {
    demoProjectRef: guard.demoProjectRef,
    productionProjectRef: guard.productionProjectRef,
    maskedSupabaseUrl: guard.maskedSupabaseUrl,
    maskedDatabaseTarget: maskDatabaseUrlFromProjectRef(guard.demoProjectRef),
  };
}

/** Apply-mode validation — requires direct demo database URL. */
export function validateApplyDemoMigrationConfig(
  env: Record<string, string | undefined>,
): DemoMigrationApplyConfig {
  const dryRun = validateDryRunDemoMigrationConfig(env);
  const databaseUrl = env.DEMO_SUPABASE_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL is required for manifest-scoped migration apply",
    );
  }

  assertDatabaseUrlMatchesDemoRef(databaseUrl, dryRun.demoProjectRef);

  return {
    ...dryRun,
    databaseUrl,
    maskedDatabaseTarget: maskDatabaseUrl(databaseUrl),
  };
}

/** @deprecated Use validateDryRunDemoMigrationConfig or validateApplyDemoMigrationConfig */
export function validateDemoMigrationRunnerConfig(
  env: Record<string, string | undefined>,
): DemoMigrationApplyConfig {
  return validateApplyDemoMigrationConfig(env);
}

export function buildDryRunReport(config: DemoMigrationDryRunConfig): DemoMigrationDryRunReport {
  rejectOutOfManifestDiscovery();
  return {
    mode: "dry-run",
    maskedProjectRef: maskProjectRef(config.demoProjectRef),
    maskedDatabaseTarget: config.maskedDatabaseTarget,
    migrations: loadRequiredMigrationPlan(),
  };
}

export function formatDryRunReport(report: DemoMigrationDryRunReport): string {
  const lines = [
    "Demo Migration Runner — DRY RUN",
    "================================",
    `Target project: ${report.maskedProjectRef}`,
    `Database target: ${report.maskedDatabaseTarget}`,
    "",
    `Approved manifest (${report.migrations.length} files):`,
  ];

  for (const entry of report.migrations) {
    lines.push(
      `${entry.order.toString().padStart(2, " ")}. ${entry.file}  sha256=${entry.sha256}  tx=${entry.transactionMode}  [${entry.ledgerStatus}]`,
    );
  }

  lines.push("");
  lines.push("No DNS lookup, database connection, ledger creation, or SQL execution performed.");
  return lines.join("\n");
}

export function assertApplyConfirmation(
  provided: string | undefined,
  demoProjectRef: string,
): void {
  if (!provided || provided.trim() !== demoProjectRef) {
    throw new Error(
      `Apply confirmation must exactly match DEMO_SUPABASE_PROJECT_REF (${maskProjectRef(demoProjectRef)})`,
    );
  }
}

export function assertMigrationContentMatchesPlan(
  entry: DemoMigrationPlanEntry,
  sourceSql: string,
): void {
  const contentHash = hashMigrationContent(sourceSql);
  if (contentHash !== entry.sha256) {
    throw new Error(`Migration file hash changed during apply planning: ${entry.file}`);
  }
}

function resolveMigrationExecutionSql(entry: DemoMigrationPlanEntry, sourceSql: string): string {
  if (entry.transactionMode === "normalized_transaction_wrapper") {
    return normalize055MigrationForAtomicExecution(entry.file, sourceSql).executionSql;
  }
  if (entry.transactionMode === "self_contained_transaction") {
    throw new Error(
      `Migration ${entry.file} is not approved for atomic demo apply (${entry.transactionMode})`,
    );
  }
  return sourceSql;
}

async function applySingleMigration(input: {
  client: DatabaseExecutor;
  entry: DemoMigrationPlanEntry;
  sql: string;
}): Promise<void> {
  const executionSql = resolveMigrationExecutionSql(input.entry, input.sql);

  await input.client.withTransaction(async (tx) => {
    await tx.query(executionSql);
    await insertDatabaseLedgerRow(tx, {
      filename: input.entry.file,
      sha256: input.entry.sha256,
    });
  });
}

export async function applyDemoMigrations(input: {
  config: DemoMigrationApplyConfig;
  confirmation: string;
  env: Record<string, string | undefined>;
  createClient: (databaseUrl: string) => Promise<DatabaseExecutor>;
}): Promise<DemoMigrationApplyReport> {
  assertApplyConfirmation(input.confirmation, input.config.demoProjectRef);

  const plan = loadRequiredMigrationPlan();
  const applied: string[] = [];
  const skipped: string[] = [];
  const lockKey = computeDemoMigrationAdvisoryLockKey(input.config.demoProjectRef);

  const client = await input.createClient(input.config.databaseUrl);
  let lockHeld = false;
  try {
    lockHeld = await client.tryAdvisoryLock(lockKey);
    if (!lockHeld) {
      throw new Error("Another demo migration run holds the advisory lock — refusing concurrent apply");
    }

    await initializeDemoOpsLedger(client);

    for (const entry of plan) {
      assertMigrationFileAllowed(entry.file);

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

  return {
    mode: "apply",
    maskedProjectRef: maskProjectRef(input.config.demoProjectRef),
    applied,
    skipped,
  };
}

export function formatApplyReport(report: DemoMigrationApplyReport): string {
  const lines = [
    "Demo Migration Runner — APPLY COMPLETE",
    "====================================",
    `Target project: ${report.maskedProjectRef}`,
    `Applied: ${report.applied.length}`,
    `Skipped (database ledger): ${report.skipped.length}`,
  ];
  if (report.applied.length > 0) {
    lines.push("", "Applied files:");
    for (const file of report.applied) lines.push(`- ${file}`);
  }
  if (report.skipped.length > 0) {
    lines.push("", "Skipped files:");
    for (const file of report.skipped) lines.push(`- ${file}`);
  }
  return lines.join("\n");
}
