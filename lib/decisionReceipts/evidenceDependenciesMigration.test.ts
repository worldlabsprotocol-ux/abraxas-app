import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = resolve(process.cwd(), "supabase/migrations/113_decision_receipt_evidence_dependencies.sql");

describe("113 decision_receipt_evidence_dependencies migration", () => {
  it("creates internal evidence dependency records indexed by receipt", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("decision_receipt_evidence_dependencies");
    expect(sql).toContain("receipt_id");
    expect(sql).toContain("fact_id");
    expect(sql).toContain("source_credential_id");
    expect(sql).toContain("dependency_type");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).not.toMatch(/date_of_birth|legal_name|document/i);
  });
});
