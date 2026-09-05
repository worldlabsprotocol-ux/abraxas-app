// FILE: lib/goodTrouble/migration078AgeEvidence.sqlParity.test.ts
// SQL parity: migration 078 age_evidence_records is additive and idempotent.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_078 = readFileSync(
  resolve(process.cwd(), "supabase/migrations/078_age_evidence_records.sql"),
  "utf8",
);

describe("migration 078 age_evidence_records SQL parity", () => {
  it("creates age_evidence_records without altering partner_policies", () => {
    expect(MIGRATION_078).toContain("create table if not exists public.age_evidence_records");
    expect(MIGRATION_078).not.toContain("partner_policies");
    expect(MIGRATION_078).not.toContain("publish_partner_policy_draft");
  });

  it("enables RLS and restricts to service_role", () => {
    expect(MIGRATION_078).toContain("enable row level security");
    expect(MIGRATION_078).toContain("grant select, insert, update on public.age_evidence_records to service_role");
    expect(MIGRATION_078).toContain("revoke all on public.age_evidence_records from anon, authenticated");
  });

  it("does not store PII columns", () => {
    expect(MIGRATION_078).not.toMatch(/date_of_birth|legal_name|document_number/i);
    expect(MIGRATION_078).toContain("provider_reference_hash");
  });
});
