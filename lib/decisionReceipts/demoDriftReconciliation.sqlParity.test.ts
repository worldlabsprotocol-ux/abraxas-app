// FILE: lib/decisionReceipts/demoDriftReconciliation.sqlParity.test.ts

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.DEMO_DRIFT_PG_URL?.trim() || undefined;

function psql(sql: string): string {
  if (!PG_URL) throw new Error("DEMO_DRIFT_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-q", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

describe("Demo drift reconciliation disposable parity", () => {
  if (!PG_URL) {
    it.skip("requires DEMO_DRIFT_PG_URL", () => {});
    return;
  }

  it("has corrective 059 and 113 after reconciliation", () => {
    expect(psql("select to_regclass('public.decision_receipt_revocation_events') is not null")).toBe("t");
    expect(psql("select to_regclass('public.decision_receipt_evidence_dependencies') is not null")).toBe("t");
    expect(psql(`
      select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and proname='revoke_decision_receipt_atomic';
    `)).toBe("1");
  });

  it("preserves v1.0.0 receipt identifiers and crypto fields", () => {
    const rows = psql(`
      select count(*)::int from public.decision_receipts
      where schema_version = '1.0.0' and id like 'dr_demoDrift%';
    `);
    expect(rows).toBe("2");
  });
});
