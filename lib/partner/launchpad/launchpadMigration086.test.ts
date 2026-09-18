// FILE: lib/partner/launchpad/launchpadMigration086.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations/086_partner_launchpad_provision_schema_fix.sql",
);

describe("086_partner_launchpad_provision_schema_fix migration contract", () => {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf8");

  it("adds partners columns required by 084/085 when missing", () => {
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS is_external");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS public_listing_ok");
  });

  it("fixes partner_policies insert to match 018 schema (no updated_at column)", () => {
    const policyInsert = migrationSql.match(
      /INSERT INTO public\.partner_policies \([\s\S]*?\) VALUES/,
    )?.[0];
    expect(policyInsert).toContain("rules_json");
    expect(policyInsert).not.toContain("updated_at");
  });

  it("preserves hardened provision RPC from 085", () => {
    expect(migrationSql).toContain("partner_launchpad_provision_sandbox_atomic");
    expect(migrationSql).toContain("idempotency_replay");
    expect(migrationSql).toContain("launchpad_provision:");
  });
});
