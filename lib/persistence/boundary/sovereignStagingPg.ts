// FILE: lib/persistence/boundary/sovereignStagingPg.ts
// Direct PostgreSQL pool for sovereign staging only (no Supabase SDK).

import "server-only";

import pg from "pg";
import type { Pool, PoolConfig, QueryResultRow } from "pg";
import { parseSovereignEnvClass } from "@/lib/sovereignRuntime/sovereignActivationPolicy";
import { assertNotProductionSupabaseProject } from "./isolationGuard";
import { SOVEREIGN_STAGING_PG_URL_ENV } from "./config";

let stagingPool: Pool | null = null;

function buildPoolConfig(databaseUrl: string, env: Record<string, string | undefined>): PoolConfig {
  const max = Number.parseInt(env.ABRAXAS_PG_POOL_MAX ?? "4", 10) || 4;
  return {
    connectionString: databaseUrl,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

export function resolveSovereignStagingDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const envClass = parseSovereignEnvClass(env);
  if (envClass !== "staging" && envClass !== "disposable") return null;
  return (
    env[SOVEREIGN_STAGING_PG_URL_ENV]?.trim()
    ?? env.ABRAXAS_DATABASE_URL?.trim()
    ?? env.ABRAXAS_DISPOSABLE_PG_TEST_URL?.trim()
    ?? null
  );
}

export function resetSovereignStagingPgPoolForTests(): void {
  if (stagingPool) void stagingPool.end().catch(() => undefined);
  stagingPool = null;
}

export function getSovereignStagingPgPool(
  env: Record<string, string | undefined> = process.env,
): Pool | null {
  const url = resolveSovereignStagingDatabaseUrl(env);
  if (!url) return null;
  const blocked = assertNotProductionSupabaseProject(url);
  if (blocked) return null;
  if (!stagingPool) {
    stagingPool = new pg.Pool(buildPoolConfig(url, env));
  }
  return stagingPool;
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
