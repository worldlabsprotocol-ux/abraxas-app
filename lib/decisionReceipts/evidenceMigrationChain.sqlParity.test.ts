// FILE: lib/decisionReceipts/evidenceMigrationChain.sqlParity.test.ts

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_EVIDENCE_CHAIN_PG_URL?.trim()
  || process.env.MIGRATION_153_PG_URL?.trim()
  || undefined;

function psql(sql: string): string {
  if (!PG_URL) throw new Error("MIGRATION_EVIDENCE_CHAIN_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

describe("evidence migration chain (059→093→113→151→153)", () => {
  if (!PG_URL) {
    it.skip("requires disposable Postgres", () => {});
    return;
  }

  it("creates evidence dependency and revocation tables with FK to decision_receipts", () => {
    expect(psql("select to_regclass('public.decision_receipt_evidence_dependencies') is not null")).toBe("t");
    expect(psql("select to_regclass('public.decision_receipt_revocation_events') is not null")).toBe("t");
    expect(psql("select to_regclass('public.reusable_eligibility_facts') is not null")).toBe("t");
    const fk = psql(`
      select count(*)::int from pg_constraint
      where conrelid = 'public.decision_receipt_evidence_dependencies'::regclass
        and contype = 'f'
        and pg_get_constraintdef(oid) like '%decision_receipts%';
    `);
    expect(Number(fk)).toBeGreaterThan(0);
  });

  it("reapplies 113 and 059 idempotently", () => {
    const root = process.cwd();
    execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-f", `${root}/supabase/migrations/059_decision_receipt_revocation_events.sql`]);
    execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-f", `${root}/supabase/migrations/113_decision_receipt_evidence_dependencies.sql`]);
    expect(true).toBe(true);
  });
});
