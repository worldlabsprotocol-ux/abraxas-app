// FILE: lib/goodTrouble/migration079IdentityReviewSessions.sqlParity.test.ts

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/079_identity_review_sessions.sql",
);

describe("migration 079 identity review sessions parity", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("creates identity_review_sessions additively", () => {
    expect(sql).toContain("create table if not exists public.identity_review_sessions");
    expect(sql).not.toMatch(/drop table/i);
  });

  it("enables RLS and restricts client access", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on public.identity_review_sessions from anon, authenticated");
    expect(sql).toContain("grant select, insert, update on public.identity_review_sessions to service_role");
  });

  it("indexes partner, policy, status, and purge eligibility", () => {
    expect(sql).toContain("idx_identity_review_sessions_partner_status");
    expect(sql).toContain("idx_identity_review_sessions_purge_eligible");
    expect(sql).toContain("idx_identity_review_sessions_one_pending_flow");
  });
});
