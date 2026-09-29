// FILE: lib/partner/launchpad/launchpadMigrationChain.test.ts

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER,
  LAUNCHPAD_MIGRATION_CHAIN,
  LAUNCHPAD_PRODUCTION_MIGRATION_ORDER,
  LAUNCHPAD_REPAIR_MIGRATION_INVARIANTS,
  validateLaunchpadMigrationChain,
} from "./launchpadMigrationChain";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

function readMigration(file: string): string {
  const path = resolve(MIGRATIONS_DIR, file);
  expect(existsSync(path), `${file} must exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("Launchpad production migration chain", () => {
  it("validates dependency order without errors", () => {
    expect(validateLaunchpadMigrationChain()).toEqual([]);
  });

  it("includes all chain migrations on disk", () => {
    for (const file of LAUNCHPAD_PRODUCTION_MIGRATION_ORDER) {
      expect(existsSync(resolve(MIGRATIONS_DIR, file))).toBe(true);
    }
  });

  it("116 references production_activated_at and documents 110 prerequisite", () => {
    const sql = readMigration("116_partner_application_policy_bindings.sql");
    expect(sql).toContain("production_activated_at");
    expect(sql).toContain("110_partner_launchpad_activate_production_atomic.sql");
  });

  it("110 owns production_activated_at column creation", () => {
    const sql = readMigration("110_partner_launchpad_activate_production_atomic.sql");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS production_activated_at");
  });

  it("117 requires hosted_partner_flow_handoffs from 099", () => {
    const sql117 = readMigration("117_hosted_handoff_policy_binding.sql");
    expect(sql117).toContain("hosted_partner_flow_handoffs");
    expect(sql117).toContain("099_hosted_partner_flow_handoffs.sql");
    const sql099 = readMigration("099_hosted_partner_flow_handoffs.sql");
    expect(sql099).toContain("CREATE TABLE IF NOT EXISTS public.hosted_partner_flow_handoffs");
  });

  it("118 assumes binding table and production activation infrastructure", () => {
    const sql = readMigration("118_binding_production_authorization.sql");
    expect(sql).toContain("partner_launchpad_application_policies");
    expect(sql).toContain("production_activated_at");
    expect(sql).toContain("launchpad_application_id");
    expect(sql).toContain("partner_launchpad_activate_production_atomic");
  });

  it("095 owns partner_api_keys.launchpad_application_id", () => {
    const sql = readMigration("095_partner_launchpad_production_credential_atomic.sql");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS launchpad_application_id");
  });
});

describe("119 repair migration invariants", () => {
  const sql = readMigration(LAUNCHPAD_REPAIR_MIGRATION_INVARIANTS.file);

  it("uses idempotent DDL for drifted production repair", () => {
    for (const fragment of LAUNCHPAD_REPAIR_MIGRATION_INVARIANTS.mustContain) {
      expect(sql).toContain(fragment);
    }
  });

  it("does not destructive-reset or duplicate handoff table", () => {
    for (const fragment of LAUNCHPAD_REPAIR_MIGRATION_INVARIANTS.mustNotContain) {
      expect(sql).not.toContain(fragment);
    }
  });

  it("backfills activation only from authoritative events", () => {
    expect(sql).toContain("production_application_activated");
    expect(sql).toContain("r.reviewed_at");
    expect(sql).not.toMatch(/SET production_activated_at\s*=\s*now\(\)/i);
    const updateBlocks = sql.split(/^UPDATE /m).slice(1).join("");
    expect(updateBlocks).not.toMatch(/environment\s*=\s*'production'/);
  });
});

describe("drifted production repair order", () => {
  it("starts with 119 and ends with 118", () => {
    expect(LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER[0]).toBe("119_launchpad_production_schema_repair.sql");
    expect(LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER.at(-1)).toBe("118_binding_production_authorization.sql");
  });

  it("places 099 before 117 and 110 before 116", () => {
    const idx = (file: string) => LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER.indexOf(file as typeof LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER[number]);
    expect(idx("099_hosted_partner_flow_handoffs.sql")).toBeLessThan(idx("117_hosted_handoff_policy_binding.sql"));
    expect(idx("110_partner_launchpad_activate_production_atomic.sql")).toBeLessThan(idx("116_partner_application_policy_bindings.sql"));
    expect(idx("119_launchpad_production_schema_repair.sql")).toBeLessThan(idx("116_partner_application_policy_bindings.sql"));
  });

  it("covers every migration in the chain contract", () => {
    const chainFiles = new Set(LAUNCHPAD_MIGRATION_CHAIN.map((e) => e.file));
    for (const file of LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER) {
      expect(chainFiles.has(file), `${file} should be in LAUNCHPAD_MIGRATION_CHAIN`).toBe(true);
    }
  });
});

describe("fresh schema path", () => {
  it("canonical order applies 110 before 116 and 099 before 117", () => {
    const idx = (file: string) => LAUNCHPAD_PRODUCTION_MIGRATION_ORDER.indexOf(file as typeof LAUNCHPAD_PRODUCTION_MIGRATION_ORDER[number]);
    expect(idx("110_partner_launchpad_activate_production_atomic.sql")).toBeLessThan(idx("116_partner_application_policy_bindings.sql"));
    expect(idx("099_hosted_partner_flow_handoffs.sql")).toBeLessThan(idx("117_hosted_handoff_policy_binding.sql"));
  });
});
