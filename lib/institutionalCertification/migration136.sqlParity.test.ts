import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PG_URL = process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || process.env.DATABASE_URL?.trim()
  || undefined;

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

  it("enforces legacy link primary key and challenge consume replay protection", () => {
    const subject = "abx_hs_0123456789012345678901234567890ab";
    psql(`
      INSERT INTO public.passport_holder_legacy_links (subject_id, legacy_kind, legacy_key)
      VALUES ('${subject}', 'sui', '0xlegacy')
      ON CONFLICT DO NOTHING;
    `);
    expect(() => psql(`
      INSERT INTO public.passport_holder_legacy_links (subject_id, legacy_kind, legacy_key)
      VALUES ('abx_hs_ffffffffffffffffffffffffffffffff', 'sui', '0xlegacy');
    `)).toThrow();

    const challengeId = "peac_test_replay";
    const wallet = "0x00000000000000000000000000000000000000bb";
    const ctxHash = "ctx_hash_replay";
    psql(`
      INSERT INTO public.passport_evm_auth_challenges (
        id, wallet_address, chain_id, origin, intended_action, session_context_hash,
        nonce, message, expires_at
      ) VALUES (
        '${challengeId}',
        '${wallet}',
        1,
        'https://example.com',
        'passport_sign_in',
        '${ctxHash}',
        'nonce_replay_test_001',
        'sign me',
        now() + interval '10 minutes'
      );
    `);

    const consumed = psql(`
      select id from public.consume_passport_evm_auth_challenge('${challengeId}', '${wallet}', '${ctxHash}');
    `);
    expect(consumed).toBe(challengeId);

    const replay = psql(`
      select id from public.consume_passport_evm_auth_challenge('${challengeId}', '${wallet}', '${ctxHash}');
    `);
    expect(replay).toBe("");
  });

  it("adds holder_subject_id column probe on identity_verifications", () => {
    const cols = psql(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'identity_verifications'
        and column_name = 'holder_subject_id';
    `);
    expect(cols).toBe("holder_subject_id");
  });
});
