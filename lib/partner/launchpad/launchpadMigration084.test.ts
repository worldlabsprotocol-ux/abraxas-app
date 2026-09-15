// FILE: lib/partner/launchpad/launchpadMigration084.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations/084_partner_launchpad_foundation.sql",
);

describe("084_partner_launchpad_foundation migration contract", () => {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf8");

  it("uses SECURITY DEFINER with safe search_path", () => {
    expect(migrationSql).toContain("SECURITY DEFINER");
    expect(migrationSql).toContain("SET search_path = pg_catalog, public");
  });

  it("creates launchpad tables with RLS enabled", () => {
    expect(migrationSql).toContain("partner_launchpad_applications");
    expect(migrationSql).toContain("partner_launchpad_activity");
    expect(migrationSql).toContain("partner_production_access_requests");
    expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("revokes PUBLIC access and grants service_role only", () => {
    expect(migrationSql).toContain("REVOKE ALL ON public.partner_launchpad_applications FROM PUBLIC");
    expect(migrationSql).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_launchpad_applications TO service_role");
    expect(migrationSql).toContain("REVOKE EXECUTE ON FUNCTION public.partner_launchpad_provision_sandbox_atomic");
    expect(migrationSql).toContain("GRANT EXECUTE ON FUNCTION public.partner_launchpad_provision_sandbox_atomic");
    expect(migrationSql).toContain("TO postgres, service_role");
  });

  it("stores only hashed keys and supports idempotency replay", () => {
    expect(migrationSql).toContain("p_key_hash");
    expect(migrationSql).not.toContain("p_raw");
    expect(migrationSql).toContain("idempotency_replay");
    expect(migrationSql).toContain("abx_test_");
  });
});
