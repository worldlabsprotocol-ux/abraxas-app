// FILE: lib/persistence/pgPool.ts
// Abraxas-operated PostgreSQL pool (no Supabase SDK).

import "server-only";

import pg from "pg";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { resolveIndependentPostgresUrl, resolvePersistenceBackend } from "./env";

let cachedPool: Pool | null = null;

export function resetAbraxasPgPoolForTests(): void {
  if (cachedPool) {
    void cachedPool.end().catch(() => undefined);
  }
  cachedPool = null;
}

export function getAbraxasPgPool(
  env: Record<string, string | undefined> = process.env,
): Pool | null {
  if (resolvePersistenceBackend(env) !== "postgres_direct") return null;
  const url = resolveIndependentPostgresUrl(env);
  if (!url) return null;
  if (!cachedPool) {
    cachedPool = new pg.Pool({
      connectionString: url,
      max: Number.parseInt(env.ABRAXAS_PG_POOL_MAX ?? "8", 10) || 8,
    });
  }
  return cachedPool;
}

export function requireAbraxasPgPool(
  env: Record<string, string | undefined> = process.env,
): Pool {
  const pool = getAbraxasPgPool(env);
  if (!pool) {
    throw new Error("postgres_direct persistence requires ABRAXAS_DATABASE_URL");
  }
  return pool;
}

export async function queryAbraxasPg<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  env: Record<string, string | undefined> = process.env,
): Promise<{ rows: T[] }> {
  const pool = requireAbraxasPgPool(env);
  const result = await pool.query<T>(sql, params);
  return { rows: result.rows };
}

export async function withAbraxasPgTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  env: Record<string, string | undefined> = process.env,
): Promise<T> {
  const pool = requireAbraxasPgPool(env);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
