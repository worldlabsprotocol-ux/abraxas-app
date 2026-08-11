import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hashMigrationContent } from "./demoMigrationLedger";
import {
  DEMO_MIGRATION_055_FILENAME,
  normalize055MigrationForAtomicExecution,
  scanTopLevelTransactionControls,
} from "./demoMigration055Normalization";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations",
  DEMO_MIGRATION_055_FILENAME,
);

describe("demoMigration055Normalization", () => {
  it("normalizes the exact 055 manifest file by stripping one top-level BEGIN and COMMIT", () => {
    const sourceSql = readFileSync(MIGRATION_PATH, "utf8");
    const { executionSql, sourceSha256 } = normalize055MigrationForAtomicExecution(
      DEMO_MIGRATION_055_FILENAME,
      sourceSql,
    );

    expect(sourceSha256).toBe(hashMigrationContent(sourceSql));
    expect(executionSql).not.toMatch(/^\s*begin\s*;\s*$/im);
    expect(executionSql).not.toMatch(/^\s*commit\s*;\s*$/im);
    expect(executionSql).toContain("enforce_partner_policy_immutability");
    expect(executionSql).toContain("partner_policies_one_active_per_id");

    const scan = scanTopLevelTransactionControls(executionSql);
    expect(scan.beginLineIndexes).toHaveLength(0);
    expect(scan.commitLineIndexes).toHaveLength(0);
  });

  it("leaves the on-disk source migration file unchanged", () => {
    const before = readFileSync(MIGRATION_PATH, "utf8");
    normalize055MigrationForAtomicExecution(DEMO_MIGRATION_055_FILENAME, before);
    const after = readFileSync(MIGRATION_PATH, "utf8");
    expect(after).toBe(before);
  });

  it("ignores commented transaction-control words when scanning", () => {
    const sourceSql = [
      "-- BEGIN;",
      "begin;",
      "select 1;",
      "-- COMMIT;",
      "commit;",
    ].join("\n");

    const scan = scanTopLevelTransactionControls(sourceSql);
    expect(scan.beginLineIndexes).toHaveLength(1);
    expect(scan.commitLineIndexes).toHaveLength(1);

    const { executionSql } = normalize055MigrationForAtomicExecution(
      DEMO_MIGRATION_055_FILENAME,
      sourceSql,
    );
    expect(executionSql).toContain("-- BEGIN;");
    expect(executionSql).toContain("-- COMMIT;");
    expect(executionSql).toContain("select 1;");
    expect(executionSql).not.toMatch(/^\s*begin\s*;\s*$/im);
    expect(executionSql).not.toMatch(/^\s*commit\s*;\s*$/im);
  });

  it("does not count nested PL/pgSQL begin blocks inside dollar quotes", () => {
    const sourceSql = readFileSync(MIGRATION_PATH, "utf8");
    const scan = scanTopLevelTransactionControls(sourceSql);
    expect(scan.beginLineIndexes).toHaveLength(1);
    expect(scan.commitLineIndexes).toHaveLength(1);
  });

  it("rejects missing BEGIN", () => {
    expect(() =>
      normalize055MigrationForAtomicExecution(
        DEMO_MIGRATION_055_FILENAME,
        "select 1;\ncommit;\n",
      ),
    ).toThrow(/missing the required top-level BEGIN/i);
  });

  it("rejects missing COMMIT", () => {
    expect(() =>
      normalize055MigrationForAtomicExecution(
        DEMO_MIGRATION_055_FILENAME,
        "begin;\nselect 1;\n",
      ),
    ).toThrow(/missing the required top-level COMMIT/i);
  });

  it("rejects duplicate top-level transaction-control statements", () => {
    expect(() =>
      normalize055MigrationForAtomicExecution(
        DEMO_MIGRATION_055_FILENAME,
        "begin;\nselect 1;\nbegin;\ncommit;\n",
      ),
    ).toThrow(/multiple top-level BEGIN/i);

    expect(() =>
      normalize055MigrationForAtomicExecution(
        DEMO_MIGRATION_055_FILENAME,
        "begin;\nselect 1;\ncommit;\ncommit;\n",
      ),
    ).toThrow(/multiple top-level COMMIT/i);
  });

  it("rejects wrong manifest filename", () => {
    expect(() =>
      normalize055MigrationForAtomicExecution("006_abraxas_id.sql", "begin;\nselect 1;\ncommit;\n"),
    ).toThrow(/only permitted for 055_policy_immutable_versions\.sql/i);
  });

  it("rejects empty normalization output", () => {
    expect(() =>
      normalize055MigrationForAtomicExecution(
        DEMO_MIGRATION_055_FILENAME,
        "begin;\ncommit;\n",
      ),
    ).toThrow(/empty migration body|empty SQL/i);
  });
});
