import { describe, expect, it } from "vitest";
import { auditMigrationFiles } from "./migrationSqlAudit";
import { SOLANA_INCREMENTAL_MIGRATION_FILES } from "./solanaIncrementalMigrations";

describe("auditMigrationFiles 134–138", () => {
  it("passes static destructive-pattern audit", () => {
    const result = auditMigrationFiles(SOLANA_INCREMENTAL_MIGRATION_FILES);
    expect(result.pass).toBe(true);
    expect(result.findings.filter(f => f.severity === "stop")).toHaveLength(0);
  });
});
