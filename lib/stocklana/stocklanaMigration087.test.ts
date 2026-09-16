// FILE: lib/stocklana/stocklanaMigration087.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations/087_stocklana_pilot.sql",
);

const PR_292_PREVIEW_CALLBACK =
  "https://abraxas-app-git-cursor-st-21cf4b-worldlabsprotocol-uxs-projects.vercel.app/stocklana/callback";

describe("087_stocklana_pilot migration contract", () => {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf8");

  it("adds partners columns defensively when missing", () => {
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS is_external");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS public_listing_ok");
  });

  it("seeds partner_policies before partners with composite PK conflict target", () => {
    const policyPos = migrationSql.indexOf("INSERT INTO public.partner_policies");
    const partnerPos = migrationSql.indexOf("INSERT INTO public.partners");
    expect(policyPos).toBeGreaterThan(-1);
    expect(partnerPos).toBeGreaterThan(policyPos);
    expect(migrationSql).toContain("ON CONFLICT (id, version) DO UPDATE");
    expect(migrationSql).not.toMatch(/ON CONFLICT \(id\) DO UPDATE/);
  });

  it("allowlists PR #292 preview callback URL and merges return URLs idempotently", () => {
    expect(migrationSql).toContain(PR_292_PREVIEW_CALLBACK);
    expect(migrationSql).toContain("COALESCE(partners.allowed_return_urls");
    expect(migrationSql).toContain("|| EXCLUDED.allowed_return_urls");
  });

  it("documents coexistence after launchpad 086", () => {
    expect(migrationSql).toContain("086_partner_launchpad_provision_schema_fix");
  });
});
