import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

describe("091_partner_flow_continuations migration contract", () => {
  const sql = readFileSync(resolve(MIGRATIONS_DIR, "091_partner_flow_continuations.sql"), "utf8");

  it("is numbered 091 so it does not collide with Launchpad 084", () => {
    expect(existsSync(resolve(MIGRATIONS_DIR, "084_partner_launchpad_foundation.sql"))).toBe(true);
    expect(existsSync(resolve(MIGRATIONS_DIR, "084_partner_flow_continuations.sql"))).toBe(false);
    const collisions = readdirSync(MIGRATIONS_DIR).filter((name) => name.startsWith("084_"));
    expect(collisions).toEqual(["084_partner_launchpad_foundation.sql"]);
  });

  it("is idempotent and Production-required for Partner Flow, not Circle", () => {
    expect(sql).toContain("create table if not exists public.partner_flow_continuations");
    expect(sql).toContain("create index if not exists idx_partner_flow_continuations_partner_expires");
    expect(sql).toContain("ocntwbxarpjeixdnzide already has this table");
    expect(sql).toContain("Do not apply 089 or 090 to Production");
    expect(sql).not.toContain("partner_settlement_intents");
    expect(sql).not.toContain("CIRCLE");
    expect(sql.toLowerCase()).toContain("grant select, insert, update on table public.partner_flow_continuations to service_role");
  });
});
