import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(process.cwd(), "supabase/migrations/088_policy_change_control.sql");

describe("088_policy_change_control migration contract", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("is DEMO-only and does not target production", () => {
    expect(sql).toContain("DEMO-only");
    expect(sql).toContain("Do not run against MAIN / Production");
    expect(sql).toContain("ocntwbxarpjeixdnzide");
  });

  it("creates append-only audit and adoption tables", () => {
    expect(sql).toContain("partner_policy_lifecycle_audit");
    expect(sql).toContain("partner_policy_adoptions");
    expect(sql).toContain("append-only");
    expect(sql).toContain("created");
    expect(sql).toContain("draft_changed");
    expect(sql).toContain("published");
    expect(sql).toContain("adopted");
    expect(sql).toContain("deprecated");
  });

  it("prevents deleting versions with receipts or partner bindings", () => {
    expect(sql).toContain("issued receipts exist");
    expect(sql).toContain("active partner bindings exist");
    expect(sql).toContain("decision_receipts");
    expect(sql).toContain("partner_launchpad_applications");
  });

  it("keeps published identity and rules frozen", () => {
    expect(sql).toContain("cannot mutate");
    expect(sql).toContain("rules_json");
    expect(sql).toContain("deprecate_effective_at");
  });

  it("grants service_role only and revokes public/anon/authenticated", () => {
    expect(sql.toLowerCase()).toContain("grant select, insert on public.partner_policy_lifecycle_audit to service_role");
    expect(sql.toLowerCase()).toContain("revoke all on public.partner_policy_lifecycle_audit from public, anon, authenticated");
    expect(sql.toLowerCase()).not.toContain("grant select on public.partner_policy_lifecycle_audit to anon");
  });
});
