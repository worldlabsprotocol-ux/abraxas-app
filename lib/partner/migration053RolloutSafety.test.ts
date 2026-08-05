import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(process.cwd(), "supabase/migrations/053_partner_flow_idempotency.sql");

const PREFLIGHT_QUERY = `select request_id, subject_id, count(*)
from public.verification_decisions
where request_id is not null
  and status = 'active'
group by request_id, subject_id
having count(*) > 1`;

const UNIQUE_INDEX_MARKER =
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_decisions_request_subject_active";

function normalizedOperatorSql(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/^\s*--\s?/, ""))
    .join("\n")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

describe("053_partner_flow_idempotency.sql rollout safety", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  const normalized = normalizedOperatorSql(sql);

  it("documents read-only duplicate-active preflight before unique index", () => {
    const preflightIndex = normalized.indexOf(PREFLIGHT_QUERY.replace(/\s+/g, " "));
    const uniqueIndexPos = sql.indexOf(UNIQUE_INDEX_MARKER);

    expect(preflightIndex).toBeGreaterThanOrEqual(0);
    expect(uniqueIndexPos).toBeGreaterThan(preflightIndex);
  });

  it("instructs operators to stop when preflight returns rows", () => {
    expect(sql).toMatch(/STOP/i);
    expect(sql).toMatch(/Do NOT apply migration 053/i);
    expect(sql).toMatch(/Preserve all rows/i);
    expect(sql).toMatch(/Investigate and reconcile manually/i);
    expect(sql).toMatch(/evidence-backed process/i);
    expect(sql).toMatch(/Do NOT delete, mutate, or silently deduplicate/i);
  });

  it("requires STEP 0 preflight comment adjacent to request_subject unique index", () => {
    const indexSection = sql.slice(sql.indexOf(UNIQUE_INDEX_MARKER) - 120, sql.indexOf(UNIQUE_INDEX_MARKER));
    expect(indexSection).toMatch(/STEP 0 preflight/i);
  });
});
