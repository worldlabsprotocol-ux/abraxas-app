// FILE: lib/decisionReceipts/v1_1_0/migration151153Chain.sqlParity.test.ts

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_151_153_PG_URL?.trim()
  || process.env.MIGRATION_153_PG_URL?.trim()
  || undefined;

function psql(sql: string): string {
  if (!PG_URL) throw new Error("MIGRATION_151_153_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

describe("migrations 151→152→153 chain parity", () => {
  if (!PG_URL) {
    it.skip("requires MIGRATION_151_153_PG_URL disposable Postgres", () => {});
    return;
  }

  it("151 adds issuance_finalized_at and pending_finalization status", () => {
    const col = psql(`
      select count(*)::int from information_schema.columns
      where table_schema = 'public' and table_name = 'decision_receipts'
        and column_name = 'issuance_finalized_at';
    `);
    expect(col).toBe("1");
    const def = psql(`
      select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.decision_receipts'::regclass
        and conname = 'decision_receipts_status_check';
    `);
    expect(def).toContain("pending_finalization");
  });

  it("152 adds dedicated v1.1.0 columns", () => {
    const cols = psql(`
      select string_agg(column_name, ',' order by column_name)
      from information_schema.columns
      where table_schema = 'public' and table_name = 'decision_receipts'
        and column_name in (
          'application_binding_ref','evidence_commitment',
          'evidence_commitment_manifest','v11_issuance_phase'
        );
    `);
    expect(cols).toContain("application_binding_ref");
    expect(cols).toContain("v11_issuance_phase");
  });

  it("151/152/153 reapplied idempotently (no duplicate object failures)", () => {
    const root = process.cwd();
    execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-f", `${root}/supabase/migrations/151_decision_receipt_issuance_finalization.sql`]);
    execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-f", `${root}/supabase/migrations/152_decision_receipt_v1_1_signed_fields.sql`]);
    execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-f", `${root}/supabase/migrations/153_decision_receipt_v11_finalize_atomic.sql`]);
    expect(true).toBe(true);
  });
});
