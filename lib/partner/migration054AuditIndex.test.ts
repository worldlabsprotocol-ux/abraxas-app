import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(process.cwd(), "supabase/migrations/054_partner_flow_audit_index.sql");

describe("054_partner_flow_audit_index.sql", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("documents operator apply steps and trace audit command", () => {
    expect(sql).toMatch(/idx_audit_events_flow_trace_id/i);
    expect(sql).toMatch(/audit:partner-flow-trace/i);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS/i);
  });
});
