/**
 * Real PostgreSQL integration tests for institutional replay RPC.
 * Requires INSTITUTIONAL_REPLAY_TEST_DATABASE_URL (disposable DB only).
 * Simulated fake-backend tests are NOT substitutes for this suite.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

const DATABASE_URL = process.env.INSTITUTIONAL_REPLAY_TEST_DATABASE_URL?.trim() ?? "";

function hashHex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function ensureMigrations(pool: Pool): Promise<void> {
  const { rows } = await pool.query(
    "SELECT 1 FROM pg_proc WHERE proname = 'institutional_eligibility_consume_nonce' LIMIT 1",
  );
  if (rows.length > 0) return;
  const root = process.cwd();
  for (const file of [
    "139_institutional_eligibility_consume_nonces.sql",
    "140_institutional_replay_rpc_hardening.sql",
  ]) {
    const sql = readFileSync(join(root, "supabase/migrations", file), "utf8");
    await pool.query(sql);
  }
}

async function callConsume(pool: Pool, nonceHash: string): Promise<string> {
  const expires = new Date(Date.now() + 15 * 60_000).toISOString();
  const subjectHash = hashHex("subject_scope:subj_pg");
  const { rows } = await pool.query(
    `SELECT public.institutional_eligibility_consume_nonce(
      $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz
    ) AS result`,
    [
      "institutional-platform",
      "",
      "rcpt_pg_001",
      subjectHash,
      "policy_pg_v1",
      1,
      "scope_a",
      nonceHash,
      expires,
    ],
  );
  const payload = rows[0]?.result as { code?: string };
  return String(payload?.code ?? "invalid");
}

describe.skipIf(!DATABASE_URL)("institutional replay RPC (PostgreSQL integration)", () => {
  it("allows exactly one concurrent consumer under real transaction isolation", async () => {
    const pool = new Pool({ connectionString: DATABASE_URL });
    try {
      await ensureMigrations(pool);
      const nonceHash = hashHex(`nonce_pg_concurrent_${Date.now()}`);
      const results = await Promise.all(Array.from({ length: 16 }, () => callConsume(pool, nonceHash)));
      expect(results.filter(c => c === "consumed")).toHaveLength(1);
      expect(results.filter(c => c === "replayed")).toHaveLength(15);
    } finally {
      await pool.end();
    }
  });

  it("rejects expired nonces at RPC boundary", async () => {
    const pool = new Pool({ connectionString: DATABASE_URL });
    try {
      await ensureMigrations(pool);
      const nonceHash = hashHex(`nonce_pg_expired_${Date.now()}`);
      const expired = new Date(Date.now() - 60_000).toISOString();
      const subjectHash = hashHex("subject_scope:subj_pg");
      const { rows } = await pool.query(
        `SELECT public.institutional_eligibility_consume_nonce(
          $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz
        ) AS result`,
        ["p", "", "r", subjectHash, "pol", 1, "", nonceHash, expired],
      );
      expect((rows[0]?.result as { code?: string }).code).toBe("expired");
    } finally {
      await pool.end();
    }
  });
});
