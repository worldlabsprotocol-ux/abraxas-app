import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(process.cwd(), "supabase/migrations/137_production_policy_change_control.sql");

describe("137_production_policy_change_control migration contract", () => {
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

  it("defines atomic adoption RPC granted to service_role only", () => {
    expect(sql).toContain("partner_policy_adopt_version_atomic");
    expect(sql).toContain("partner_policy_lifecycle_audit");
    expect(sql.toLowerCase()).toContain("grant execute on function public.partner_policy_adopt_version_atomic");
    expect(sql.toLowerCase()).toContain("revoke all on function public.partner_policy_adopt_version_atomic");
  });

  it("hardens adopt RPC with independent policy, pin, replay, and actor validation", () => {
    expect(sql).toContain("set search_path = pg_catalog, public");
    expect(sql).toContain("from public.partner_policies");
    expect(sql).toContain("policy_version_draft");
    expect(sql).toContain("adoption_audit_incomplete");
    expect(sql).toContain("v_app.partner_id");
    expect(sql).toContain("v_actor_id := v_app.partner_id");
    expect(sql).toContain("p_actor_id is not null and p_actor_id <> v_app.partner_id");
  });
});
