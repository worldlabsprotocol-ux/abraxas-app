// FILE: lib/integrations/designPartnerApplicationMigration071.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/071_design_partner_intake_rls_hardening.sql",
);

describe("071_design_partner_intake_rls_hardening migration contract", () => {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf8");

  it("confirms RLS and removes audited anon insert policy", () => {
    expect(migrationSql).toContain("ALTER TABLE public.design_partners ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain('DROP POLICY IF EXISTS "anon_insert_design_partners" ON public.design_partners');
    expect(migrationSql).not.toMatch(/FOR pol IN/i);
  });

  it("revokes direct INSERT from anon and authenticated only", () => {
    expect(migrationSql).toContain("REVOKE INSERT ON public.design_partners FROM anon, authenticated");
    expect(migrationSql).not.toContain("REVOKE SELECT");
    expect(migrationSql).not.toContain("GRANT SELECT");
    expect(migrationSql).not.toContain("GRANT UPDATE");
    expect(migrationSql).not.toContain("GRANT DELETE");
  });

  it("does not add a misleading dedup lookup index for ILIKE queries", () => {
    expect(migrationSql).not.toContain("CREATE INDEX");
    expect(migrationSql).toContain("ILIKE filters on email/company");
  });

  it("includes post-apply verification queries for operators", () => {
    expect(migrationSql).toContain("Post-apply verification");
    expect(migrationSql).toContain("FROM pg_policies");
    expect(migrationSql).toContain("role_table_grants");
    expect(migrationSql).toContain("service_role continues to operate");
  });
});
