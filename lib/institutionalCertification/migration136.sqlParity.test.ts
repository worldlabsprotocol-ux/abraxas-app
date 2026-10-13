import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_136_PG_URL?.trim() || undefined;

function psql(sql: string): string {
  if (!PG_URL) throw new Error("MIGRATION_136_PG_URL is required");
  return execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

describe("migration 136 SQL parity (requires MIGRATION_136_PG_URL)", () => {
  if (!PG_URL) {
    it.skip("requires MIGRATION_136_PG_URL disposable Postgres", () => {});
    return;
  }

  it("applies migration 136 idempotently and enforces caip10 uniqueness", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/136_passport_holder_subjects.sql"),
      "utf8",
    );
    execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
    execFileSync("psql", [PG_URL, "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });

    psql(`INSERT INTO public.passport_holder_subjects (subject_id) VALUES ('abx_hs_0123456789012345678901234567890ab') ON CONFLICT DO NOTHING;`);
    psql(`
      INSERT INTO public.passport_holder_wallet_accounts (
        id, subject_id, caip10, chain_namespace, chain_reference, account_address, auth_method
      ) VALUES (
        'phwa_test1',
        'abx_hs_0123456789012345678901234567890ab',
        'eip155:1:0x0000000000000000000000000000000000000001',
        'eip155', '1', '0x0000000000000000000000000000000000000001', 'evm_wallet'
      ) ON CONFLICT DO NOTHING;
    `);

    expect(() => psql(`
      INSERT INTO public.passport_holder_wallet_accounts (
        id, subject_id, caip10, chain_namespace, chain_reference, account_address, auth_method
      ) VALUES (
        'phwa_test2',
        'abx_hs_0123456789012345678901234567890ab',
        'eip155:1:0x0000000000000000000000000000000000000001',
        'eip155', '1', '0x0000000000000000000000000000000000000001', 'evm_wallet'
      );
    `)).toThrow();
  });
});
