// FILE: lib/settlement/launchpadMigration086.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations/086_arc_proof_gated_settlement.sql",
);

describe("086_arc_proof_gated_settlement migration contract", () => {
  const migrationSql = readFileSync(MIGRATION_PATH, "utf8");

  it("references launchpad applications without duplicating partner records", () => {
    expect(migrationSql).toContain("REFERENCES public.partner_launchpad_applications(id)");
    expect(migrationSql).not.toContain("CREATE TABLE IF NOT EXISTS public.partners");
    expect(migrationSql).not.toContain("partner_api_keys");
  });

  it("stores no private eligibility data or plaintext keys", () => {
    expect(migrationSql).not.toContain("birth_date");
    expect(migrationSql).not.toContain("email");
    expect(migrationSql).not.toContain("raw_receipt");
    expect(migrationSql).not.toContain("signing_key");
    expect(migrationSql).toContain("receipt_commitment");
  });

  it("enables RLS and grants service_role only", () => {
    expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_launchpad_arc_settlement_config TO service_role");
    expect(migrationSql).toContain("REVOKE ALL ON public.partner_launchpad_arc_settlement_config FROM PUBLIC");
  });

  it("includes verification and rollback SQL comments", () => {
    expect(migrationSql).toContain("Verification SQL");
    expect(migrationSql).toContain("Rollback SQL");
  });

  it("restricts Arc environment to testnet only", () => {
    expect(migrationSql).toContain("'arc_testnet'");
    expect(migrationSql).not.toContain("arc_mainnet");
  });

  it("enforces unique transaction hash and atomic confirmation", () => {
    expect(migrationSql).toContain("partner_launchpad_arc_settlement_records_tx_unique");
    expect(migrationSql).toContain("partner_launchpad_arc_confirm_settlement_atomic");
    expect(migrationSql).toContain("SECURITY DEFINER");
    expect(migrationSql).toContain("SET search_path = pg_catalog, public");
    expect(migrationSql).toContain("FOR UPDATE");
  });

  it("stores amounts as bigint micro units", () => {
    expect(migrationSql).toContain("amount_micro_usdc bigint");
  });
});
