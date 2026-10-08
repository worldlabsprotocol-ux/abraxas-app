import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(process.cwd(), "supabase/migrations/136_production_policy_change_control.sql");

describe("136_production_policy_change_control migration contract", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("targets production with explicit operator approval gate", () => {
    expect(sql).toContain("bztwutzprwsdrtqdpymf");
    expect(sql).toContain("explicit approval");
    expect(sql).not.toContain("Do not run against MAIN / Production");
  });

  it("preflights 055 and 084 prerequisites", () => {
    expect(sql).toContain("partner_policies_one_active_per_id");
    expect(sql).toContain("partner_launchpad_applications");
    expect(sql).toContain("apply 055 first");
  });

  it("creates append-only audit and adoption tables", () => {
    expect(sql).toContain("partner_policy_lifecycle_audit");
    expect(sql).toContain("partner_policy_adoptions");
    expect(sql).toContain("append-only");
  });

  it("grants service_role only and revokes public/anon/authenticated", () => {
    expect(sql.toLowerCase()).toContain("grant select, insert on public.partner_policy_lifecycle_audit to service_role");
    expect(sql.toLowerCase()).toContain("revoke all on public.partner_policy_lifecycle_audit from public, anon, authenticated");
    expect(sql.toLowerCase()).not.toContain("grant select on public.partner_policy_lifecycle_audit to anon");
  });

  it("documents manual rollback steps", () => {
    expect(sql).toContain("Rollback (manual");
    expect(sql).toContain("drop table if exists public.partner_policy_adoptions");
  });
});
