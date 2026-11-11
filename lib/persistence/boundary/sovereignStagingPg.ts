// FILE: lib/persistence/boundary/sovereignStagingPg.ts
// Direct PostgreSQL pool for sovereign staging only (no Supabase SDK).

import "server-only";

import pg from "pg";
import type { Pool, PoolClient, PoolConfig, QueryResultRow } from "pg";
import {
  assertTlsReadyForInstitutional,
  parseSovereignEnvClass,
  validateSovereignDatabaseIdentity,
  type SovereignActivationIssue,
} from "@/lib/sovereignRuntime/sovereignActivationPolicy";
import { assertNotProductionSupabaseProject, type SovereignIsolationIssue } from "./isolationGuard";
import { SOVEREIGN_STAGING_PG_URL_ENV } from "./config";

let stagingPool: Pool | null = null;
let stagingPoolDatabaseUrl: string | null = null;

function databaseHostname(databaseUrl: string): string {
  try {
    return new URL(databaseUrl.replace(/^postgres(ql)?:/i, "http:")).hostname;
  } catch {
    return "";
  }
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
}

export function buildSovereignStagingPoolConfig(
  databaseUrl: string,
  env: Record<string, string | undefined>,
): PoolConfig {
  const max = Number.parseInt(env.ABRAXAS_PG_POOL_MAX ?? "4", 10) || 4;
  const config: PoolConfig = {
    connectionString: databaseUrl,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
  const sslMode = env.ABRAXAS_PG_SSL?.trim().toLowerCase();
  const sslDisabled = sslMode === "disable" || sslMode === "off";
  if (!sslDisabled && !isLocalHost(databaseHostname(databaseUrl))) {
    config.ssl = {
      rejectUnauthorized: env.ABRAXAS_PG_SSL_REJECT_UNAUTHORIZED?.trim() !== "0",
    };
  }
  return config;
}

export function explainSovereignStagingPoolRefusal(
  databaseUrl: string,
  env: Record<string, string | undefined>,
): SovereignActivationIssue | SovereignIsolationIssue | null {
  const blocked = assertNotProductionSupabaseProject(databaseUrl);
  if (blocked) return blocked;
  const envClass = parseSovereignEnvClass(env);
  if (envClass === "institutional" || envClass === "staging") {
    const identity = validateSovereignDatabaseIdentity(env);
    if (identity) return identity;
  }
  if (envClass === "institutional") {
    return assertTlsReadyForInstitutional(env);
  }
  return null;
}

export function resolveSovereignStagingDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const envClass = parseSovereignEnvClass(env);
  if (envClass === "institutional") {
    return env.ABRAXAS_DATABASE_URL?.trim() || null;
  }
  if (envClass === "staging") {
    return (
      env[SOVEREIGN_STAGING_PG_URL_ENV]?.trim()
      ?? env.ABRAXAS_DATABASE_URL?.trim()
      ?? env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
      ?? null
    );
  }
  if (envClass === "disposable") {
    return env.ABRAXAS_DISPOSABLE_PG_TEST_URL?.trim() || null;
  }
  return null;
}

export function resetSovereignStagingPgPoolForTests(): void {
  if (stagingPool) void stagingPool.end().catch(() => undefined);
  stagingPool = null;
  stagingPoolDatabaseUrl = null;
}

export function getSovereignStagingPgPool(
  env: Record<string, string | undefined> = process.env,
): Pool | null {
  const url = resolveSovereignStagingDatabaseUrl(env);
  if (!url) return null;
  if (explainSovereignStagingPoolRefusal(url, env)) return null;
  if (stagingPool && stagingPoolDatabaseUrl !== url) {
    void stagingPool.end().catch(() => undefined);
    stagingPool = null;
    stagingPoolDatabaseUrl = null;
  }
  if (!stagingPool) {
    stagingPool = new pg.Pool(buildSovereignStagingPoolConfig(url, env));
    stagingPoolDatabaseUrl = url;
  }
  return stagingPool;
}

export async function withSovereignStagingPgTransaction<T>(
  run: (client: PoolClient) => Promise<T>,
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const pool = getSovereignStagingPgPool(env);
  if (!pool) return { ok: false, error: "sovereign_staging_pg_unavailable" };
  const client = await pool.connect();
  try {
    await client.query("begin");
    const value = await run(client);
    await client.query("commit");
    return { ok: true, value };
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    client.release();
  }
}

export async function querySovereignStagingPg<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  env: Record<string, string | undefined> = process.env,
): Promise<{ rows: T[] } | { error: string }> {
  const pool = getSovereignStagingPgPool(env);
  if (!pool) return { error: "sovereign_staging_pg_unavailable" };
  try {
    const result = await pool.query<T>(sql, params);
    return { rows: result.rows };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
