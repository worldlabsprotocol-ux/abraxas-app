// FILE: lib/partner/launchpad/launchpadMigration085.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_084 = resolve(process.cwd(), "supabase/migrations/084_partner_launchpad_foundation.sql");
const MIGRATION_085 = resolve(process.cwd(), "supabase/migrations/085_partner_launchpad_hardening.sql");

describe("085_partner_launchpad_hardening migration contract", () => {
  const sql = readFileSync(MIGRATION_085, "utf8");

  it("hardens idempotency with partner tenant binding", () => {
    expect(sql).toContain("v_existing.partner_id <> p_partner_id");
    expect(sql).toContain("pg_advisory_xact_lock");
  });

  it("adds production approval RPC with live key prefix validation", () => {
    expect(sql).toContain("partner_launchpad_approve_production_atomic");
    expect(sql).toContain("^abx_live_");
    expect(sql).toContain("production_key_encrypted");
    expect(sql).toContain("production_key_revealed_at");
  });

  it("locks down production approval execute privileges", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.partner_launchpad_approve_production_atomic");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.partner_launchpad_approve_production_atomic");
    expect(sql).toContain("TO postgres, service_role");
  });

  it("adds activity partner FK and dedup index", () => {
    expect(sql).toContain("partner_launchpad_activity_partner_fk");
    expect(sql).toContain("partner_launchpad_activity_dedup_idx");
  });
});

describe("084 migration audit findings addressed in 085", () => {
  const sql084 = readFileSync(MIGRATION_084, "utf8");
  const sql085 = readFileSync(MIGRATION_085, "utf8");

  it("084 enables RLS and revokes PUBLIC on all launchpad tables", () => {
    expect(sql084).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql084).toContain("REVOKE ALL ON public.partner_launchpad_applications FROM PUBLIC");
    expect(sql084).toContain("REVOKE ALL ON public.partner_launchpad_activity FROM PUBLIC");
  });

  it("084 never stores plaintext credentials", () => {
    expect(sql084).toContain("p_key_hash");
    expect(sql084).not.toContain("p_raw");
    expect(sql084).not.toContain("plaintext");
  });

  it("085 replaces provision RPC with tenant bound idempotency", () => {
    expect(sql085).toContain("CREATE OR REPLACE FUNCTION public.partner_launchpad_provision_sandbox_atomic");
    expect(sql085).toContain("idempotency_replay");
  });
});
