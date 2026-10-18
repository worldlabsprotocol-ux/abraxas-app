// FILE: lib/persistence/pgPool.ts
// Abraxas-operated PostgreSQL pool (no Supabase SDK).

import "server-only";

import pg from "pg";
import type { Pool, PoolClient, PoolConfig, QueryResultRow } from "pg";
import {
  isPassportDirectPostgresEnabled,
  passportTransactionPgExplicitlyEnabled,
  persistenceUsesDirectPostgres,
  resolvePassportDirectPostgresUrl,
} from "./env";
import {
  isNativeAccountDirectPostgresEnabled,
  resolveNativeAccountDirectPostgresUrl,
} from "./nativeAccountPg";
import { validatePassportHybridPostgresBinding } from "./passportHybridPostgres";

let cachedPool: Pool | null = null;

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

function buildPgPoolConfig(
  databaseUrl: string,
  env: Record<string, string | undefined>,
): PoolConfig {
  const max = Number.parseInt(env.ABRAXAS_PG_POOL_MAX ?? "8", 10) || 8;
  const idleTimeoutMillis = Number.parseInt(env.ABRAXAS_PG_IDLE_TIMEOUT_MS ?? "30000", 10) || 30_000;
  let hostname = "localhost";
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    // pg parses connection string internally
  }

  const sslMode = env.ABRAXAS_PG_SSL?.trim().toLowerCase();
  const sslDisabled = sslMode === "disable" || sslMode === "off";
  const sslRequired = sslMode === "require" || (!sslDisabled && !isLocalHost(hostname));

  const config: PoolConfig = {
    connectionString: databaseUrl,
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis: Number.parseInt(env.ABRAXAS_PG_CONNECT_TIMEOUT_MS ?? "10000", 10) || 10_000,
  };

  if (sslRequired) {
    config.ssl = {
      rejectUnauthorized: env.ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED?.trim() !== "0",
    };
  }

  return config;
}

export function resetAbraxasPgPoolForTests(): void {
  if (cachedPool) {
    void cachedPool.end().catch(() => undefined);
  }
  cachedPool = null;
}

function assertPassportPgConfig(env: Record<string, string | undefined>): void {
  if (
    passportTransactionPgExplicitlyEnabled(env)
    && !persistenceUsesDirectPostgres(env)
  ) {
    const validation = validatePassportHybridPostgresBinding(env);
    if (!validation.ok) {
      throw new Error(`passport_hybrid_postgres_${validation.code}`);
    }
  }
}

function resolveAbraxasDirectPostgresUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return (
    resolvePassportDirectPostgresUrl(env)
    ?? (isNativeAccountDirectPostgresEnabled(env) ? resolveNativeAccountDirectPostgresUrl(env) : null)
  );
}

export function isAbraxasDirectPostgresEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return isPassportDirectPostgresEnabled(env) || isNativeAccountDirectPostgresEnabled(env);
}

export function getAbraxasPgPool(
  env: Record<string, string | undefined> = process.env,
): Pool | null {
  if (!isAbraxasDirectPostgresEnabled(env)) return null;
  assertPassportPgConfig(env);
  const url = resolveAbraxasDirectPostgresUrl(env);
  if (!url) return null;
  if (!cachedPool) {
    cachedPool = new pg.Pool(buildPgPoolConfig(url, env));
  }
  return cachedPool;
}

export function requireAbraxasPgPool(
  env: Record<string, string | undefined> = process.env,
): Pool {
  const pool = getAbraxasPgPool(env);
  if (!pool) {
    throw new Error(
      "Abraxas direct PostgreSQL requires ABRAXAS_DATABASE_URL, ABRAXAS_PASSPORT_DATABASE_URL, "
      + "or ABRAXAS_NATIVE_ACCOUNT_DATABASE_URL (enable ABRAXAS_PASSPORT_TRANSACTION_PG or ABRAXAS_NATIVE_ACCOUNT_PG)",
    );
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
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw error;
  } finally {
    client.release();
  }
}
