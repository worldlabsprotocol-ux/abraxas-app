// FILE: lib/goodTrouble/migration081SelfAttestationLedger.sqlParity.test.ts
// SQL parity: migration 081 self_attestation_ledger is additive and privacy-minimized.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_081 = readFileSync(
  resolve(process.cwd(), "supabase/migrations/081_self_attestation_ledger.sql"),
  "utf8",
);

describe("migration 081 self_attestation_ledger SQL parity", () => {
  it("creates self_attestation_ledger additively with age_band only", () => {
    expect(MIGRATION_081).toContain("create table if not exists public.self_attestation_ledger");
    expect(MIGRATION_081).toContain("age_band");
    expect(MIGRATION_081).not.toMatch(/date_of_birth|birth_year|birth_month|birth_day|dob_hash/i);
  });

  it("enables RLS and restricts to service_role", () => {
    expect(MIGRATION_081).toContain("enable row level security");
    expect(MIGRATION_081).toContain("grant select, insert, update on public.self_attestation_ledger to service_role");
    expect(MIGRATION_081).toContain("revoke all on public.self_attestation_ledger from anon, authenticated");
  });

  it("inserts browse policy without modifying good-trouble-retail-v1", () => {
    expect(MIGRATION_081).toContain("good-trouble-browse-v1");
    expect(MIGRATION_081).toContain("browse_access_only");
    expect(MIGRATION_081).not.toMatch(/'good-trouble-retail-v1'/);
  });

  it("migration parity script applies 080 before 081", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/ci/run-migration-081-sql-parity.sh"),
      "utf8",
    );
    const idx080 = script.indexOf("080_age_assurance_sessions.sql");
    const idx081 = script.indexOf("081_self_attestation_ledger.sql");
    expect(idx080).toBeGreaterThan(-1);
    expect(idx081).toBeGreaterThan(idx080);
  });
});
