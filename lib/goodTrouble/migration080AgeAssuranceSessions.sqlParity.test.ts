// FILE: lib/goodTrouble/migration080AgeAssuranceSessions.sqlParity.test.ts
// SQL parity: migration 080 age_assurance_sessions is additive and privacy-minimized.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_080 = readFileSync(
  resolve(process.cwd(), "supabase/migrations/080_age_assurance_sessions.sql"),
  "utf8",
);

describe("migration 080 age_assurance_sessions SQL parity", () => {
  it("creates age_assurance_sessions additively", () => {
    expect(MIGRATION_080).toContain("create table if not exists public.age_assurance_sessions");
    expect(MIGRATION_080).toContain("return_url");
  });

  it("enables RLS and restricts to service_role", () => {
    expect(MIGRATION_080).toContain("enable row level security");
    expect(MIGRATION_080).toContain("grant select, insert, update on public.age_assurance_sessions to service_role");
    expect(MIGRATION_080).toContain("revoke all on public.age_assurance_sessions from anon, authenticated");
  });

  it("includes replay-prevention and lookup indexes", () => {
    expect(MIGRATION_080).toContain("idx_age_assurance_provider_session");
    expect(MIGRATION_080).toContain("idx_age_assurance_subject_status");
    expect(MIGRATION_080).toContain("idx_age_assurance_expires");
    expect(MIGRATION_080).not.toMatch(/date_of_birth|legal_name|oauth_sub/i);
  });
});
