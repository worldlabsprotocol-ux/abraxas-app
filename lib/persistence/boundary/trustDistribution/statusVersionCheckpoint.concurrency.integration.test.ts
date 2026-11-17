import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nextSignedStatusVersion, resetOperationalDemoPgPoolForTests } from "./statusVersionCheckpoint";
import { resetPersistenceClientForTests } from "@/lib/persistence/admin";

const DEMO_DB_URL =
  process.env.ABRAXAS_DEMO_OPERATIONAL_DATABASE_URL?.trim()
  ?? process.env.SUPABASE_DB_URL?.trim()
  ?? null;

const PARALLEL_REQUESTS = 24;

function applyMigration152(pool: pg.Pool): Promise<void> {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/152_portable_export_status_checkpoint_atomic_rpc.sql"),
    "utf8",
  );
  return pool.query(sql).then(() => undefined);
}

describe("portable export status checkpoint concurrency", () => {
  if (!DEMO_DB_URL) {
    it.skip("requires ABRAXAS_DEMO_OPERATIONAL_DATABASE_URL or SUPABASE_DB_URL", () => {});
    return;
  }

  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DEMO_DB_URL, max: PARALLEL_REQUESTS + 2 });
    await applyMigration152(pool);
  }, 60_000);

  afterAll(async () => {
    resetOperationalDemoPgPoolForTests();
    resetPersistenceClientForTests();
    await pool.end().catch(() => undefined);
  });

  it("parallel RPC bumps return distinct monotonic versions", async () => {
    const receiptId = `dr_concurrency_${randomBytes(8).toString("hex")}`;
    const results = await Promise.all(
      Array.from({ length: PARALLEL_REQUESTS }, () =>
        pool.query<{ bump_portable_export_status_checkpoint: string }>(
          "select public.bump_portable_export_status_checkpoint($1) as bump_portable_export_status_checkpoint",
          [receiptId],
        ),
      ),
    );

    const versions = results.map((r) =>
      Number.parseInt(String(r.rows[0]?.bump_portable_export_status_checkpoint), 10),
    );
    expect(versions).toHaveLength(PARALLEL_REQUESTS);
    const unique = new Set(versions);
    expect(unique.size).toBe(PARALLEL_REQUESTS);
    expect(Math.min(...versions)).toBe(1);
    expect(Math.max(...versions)).toBe(PARALLEL_REQUESTS);

    await pool.query(
      "delete from public.portable_export_status_checkpoints where receipt_id = $1",
      [receiptId],
    );
  }, 30_000);

  it("nextSignedStatusVersion via direct demo pool is atomic under concurrency", async () => {
    const receiptId = `dr_ts_concurrency_${randomBytes(8).toString("hex")}`;
    const env = { ABRAXAS_DATABASE_URL: DEMO_DB_URL };
    const results = await Promise.all(
      Array.from({ length: PARALLEL_REQUESTS }, () =>
        nextSignedStatusVersion({ receiptId, env }),
      ),
    );

    const versions = results.map((r) => (typeof r === "number" ? r : null));
    expect(versions.every((v) => Number.isInteger(v) && (v as number) > 0)).toBe(true);
    const unique = new Set(versions);
    expect(unique.size).toBe(PARALLEL_REQUESTS);

    await pool.query(
      "delete from public.portable_export_status_checkpoints where receipt_id = $1",
      [receiptId],
    );
  }, 30_000);
});