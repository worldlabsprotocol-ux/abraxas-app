// FILE: scripts/demo/lib/demoMigrationTransactionAudit.ts
// Static transaction-compatibility audit for approved demo manifest migrations.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEMO_MIGRATION_055_FILENAME,
  normalize055MigrationForAtomicExecution,
  scanTopLevelTransactionControls,
} from "./demoMigration055Normalization";
import { DEMO_REQUIRED_MIGRATION_ORDER } from "./demoMigrationManifest";

export type DemoMigrationTransactionMode =
  | "atomic_wrapper"
  | "normalized_transaction_wrapper"
  | "self_contained_transaction";

export interface DemoMigrationTransactionAuditEntry {
  file: string;
  mode: DemoMigrationTransactionMode;
  hazards: string[];
  handling: string;
}

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

const CREATE_INDEX_CONCURRENTLY = /\bcreate\s+index\s+concurrently\b/i;
const VACUUM = /\bvacuum\b/i;
const ALTER_TYPE_ADD_VALUE = /\balter\s+type\b.+\badd\s+value\b/is;

export function auditMigrationFileTransactionCompatibility(
  file: string,
  sql: string,
): DemoMigrationTransactionAuditEntry {
  const hazards: string[] = [];

  if (CREATE_INDEX_CONCURRENTLY.test(sql)) {
    hazards.push("CREATE INDEX CONCURRENTLY cannot run inside a transaction block");
  }
  if (VACUUM.test(sql)) {
    hazards.push("VACUUM cannot run inside a transaction block");
  }
  if (ALTER_TYPE_ADD_VALUE.test(sql)) {
    hazards.push("ALTER TYPE ... ADD VALUE has transaction restrictions in PostgreSQL");
  }

  if (file === DEMO_MIGRATION_055_FILENAME) {
    const scan = scanTopLevelTransactionControls(sql);
    if (scan.beginLineIndexes.length === 1 && scan.commitLineIndexes.length === 1) {
      try {
        normalize055MigrationForAtomicExecution(file, sql);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          file,
          mode: "self_contained_transaction",
          hazards: [
            ...hazards,
            "Top-level BEGIN; present",
            "Top-level COMMIT; present",
            `055 normalization failed: ${message}`,
          ],
          handling:
            "055 normalization structure is invalid — abort before apply and review migration source",
        };
      }

      return {
        file,
        mode: "normalized_transaction_wrapper",
        hazards: [
          ...hazards,
          "Top-level BEGIN; stripped for atomic execution",
          "Top-level COMMIT; stripped for atomic execution",
        ],
        handling:
          "Runner strips top-level transaction boundaries from an execution copy; ledger records original source sha256; single outer transaction",
      };
    }
  }

  const scan = scanTopLevelTransactionControls(sql);
  if (scan.beginLineIndexes.length > 0 || scan.commitLineIndexes.length > 0) {
    return {
      file,
      mode: "self_contained_transaction",
      hazards: [
        ...hazards,
        ...(scan.beginLineIndexes.length > 0 ? ["Top-level BEGIN; present"] : []),
        ...(scan.commitLineIndexes.length > 0 ? ["Top-level COMMIT; present"] : []),
      ],
      handling:
        "Contains top-level transaction boundaries without an approved normalization path — abort before apply",
    };
  }

  if (hazards.length > 0) {
    return {
      file,
      mode: "self_contained_transaction",
      hazards,
      handling:
        "Contains non-transactional statements — requires explicit operator-reviewed handling before apply",
    };
  }

  return {
    file,
    mode: "atomic_wrapper",
    hazards: [],
    handling: "Wrap migration SQL and ledger insert in a single database transaction",
  };
}

export function auditRequiredDemoMigrations(): DemoMigrationTransactionAuditEntry[] {
  return DEMO_REQUIRED_MIGRATION_ORDER.map((file) => {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    return auditMigrationFileTransactionCompatibility(file, sql);
  });
}

export function getMigrationTransactionMode(file: string): DemoMigrationTransactionMode {
  const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
  return auditMigrationFileTransactionCompatibility(file, sql).mode;
}

export function assertRequiredMigrationsAreApplySafe(): void {
  const audit = auditRequiredDemoMigrations();
  const blocked = audit.filter(
    (entry) =>
      entry.mode !== "atomic_wrapper" && entry.mode !== "normalized_transaction_wrapper",
  );
  if (blocked.length > 0) {
    const files = blocked.map((entry) => `${entry.file} (${entry.mode})`).join(", ");
    throw new Error(`Demo migrations require explicit handling before apply: ${files}`);
  }
}
