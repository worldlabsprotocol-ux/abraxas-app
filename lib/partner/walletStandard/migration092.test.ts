import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WALLET_STANDARD_MIGRATION_PLAN } from "@/lib/partner/walletStandard/migrationPlan";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

describe("092_wallet_standard_action_bindings migration contract", () => {
  const sql = readFileSync(resolve(MIGRATIONS_DIR, WALLET_STANDARD_MIGRATION_PLAN.file), "utf8");

  it("is the next numbered migration after 091", () => {
    expect(existsSync(resolve(MIGRATIONS_DIR, "091_partner_flow_continuations.sql"))).toBe(true);
    const collisions = readdirSync(MIGRATIONS_DIR).filter((name) => name.startsWith("092_"));
    expect(collisions).toEqual(["092_wallet_standard_action_bindings.sql"]);
  });

  it("is tenant-scoped, service-role-only, hash-only, and fail-closed", () => {
    expect(sql).toContain("create table if not exists public.wallet_standard_challenges");
    expect(sql).toContain("create table if not exists public.wallet_standard_bindings");
    expect(sql).toContain("create table if not exists public.partner_venue_action_nonces");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on table public.wallet_standard_challenges from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update on table public.wallet_standard_challenges to service_role");
    expect(sql).toContain("wallet_standard_consume_challenge");
    expect(sql).toContain("wallet_standard_consume_binding");
    expect(sql).toContain("wallet_standard_revoke_binding");
    expect(sql).toContain("venue_consume_action_nonce");
    expect(sql).toContain("Required on Production");
    expect(sql).not.toMatch(/wallet_address text|public_key text|signature text|private_key text/i);
    expect(WALLET_STANDARD_MIGRATION_PLAN.required_on_production_for_this_feature).toBe(true);
    expect(WALLET_STANDARD_MIGRATION_PLAN.never_auto_apply_from_vercel).toBe(true);
  });
});
