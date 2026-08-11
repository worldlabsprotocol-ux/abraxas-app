// FILE: scripts/demo/lib/demoDatabaseLedger.ts
// Authoritative demo migration ledger stored in demo_ops.migration_ledger.

import {
  DEMO_MIGRATION_RUNNER_VERSION,
  DEMO_OPS_LEDGER_INIT_SQL,
  DEMO_OPS_LEDGER_INSERT_SQL,
  DEMO_OPS_LEDGER_SELECT_SQL,
} from "./demoOpsSchema";

export interface DatabaseLedgerRow {
  filename: string;
  sha256: string;
  applied_at: string;
  runner_version: string;
}

export interface DatabaseExecutor {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  withTransaction<T>(fn: (tx: DatabaseExecutor) => Promise<T>): Promise<T>;
  tryAdvisoryLock(lockKey: number): Promise<boolean>;
  advisoryUnlock(lockKey: number): Promise<void>;
  end(): Promise<void>;
}

export function computeDemoMigrationAdvisoryLockKey(projectRef: string): number {
  let hash = 0;
  const input = `abraxas:demo:migrate:${projectRef}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash;
}

export async function initializeDemoOpsLedger(client: DatabaseExecutor): Promise<void> {
  await client.query(DEMO_OPS_LEDGER_INIT_SQL);
}

export async function fetchDatabaseLedgerRow(
  client: DatabaseExecutor,
  filename: string,
): Promise<DatabaseLedgerRow | null> {
  const result = await client.query<DatabaseLedgerRow>(DEMO_OPS_LEDGER_SELECT_SQL, [filename]);
  return result.rows[0] ?? null;
}

export function assertDatabaseLedgerCompatible(
  existing: DatabaseLedgerRow | null,
  file: string,
  sha256: string,
): "skip" | "apply" {
  if (!existing) return "apply";
  if (existing.sha256 === sha256) return "skip";
  throw new Error(
    `Database ledger hash mismatch for ${file} — refusing to continue`,
  );
}

export async function insertDatabaseLedgerRow(
  client: DatabaseExecutor,
  input: {
    filename: string;
    sha256: string;
    runnerVersion?: string;
    appliedAt?: string;
  },
): Promise<DatabaseLedgerRow> {
  const result = await client.query<DatabaseLedgerRow>(DEMO_OPS_LEDGER_INSERT_SQL, [
    input.filename,
    input.sha256,
    input.runnerVersion ?? DEMO_MIGRATION_RUNNER_VERSION,
    input.appliedAt ?? null,
  ]);
  if (!result.rows[0]) {
    const existing = await fetchDatabaseLedgerRow(client, input.filename);
    if (existing?.sha256 === input.sha256) return existing;
    throw new Error(`Failed to insert database ledger row for ${input.filename}`);
  }
  return result.rows[0];
}
