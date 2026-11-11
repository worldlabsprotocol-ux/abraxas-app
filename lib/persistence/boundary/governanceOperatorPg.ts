// Governance-operator PostgreSQL pool. Uses credentials distinct from receipt runtime.
// Do not set ABRAXAS_GOVERNANCE_OPERATOR_PG_URL on ordinary Vercel receipt issuance.

import "server-only";

import pg from "pg";
import type { Pool, PoolClient } from "pg";
import { buildSovereignStagingPoolConfig } from "./sovereignStagingPg";

export const GOVERNANCE_OPERATOR_PG_URL_ENV = "ABRAXAS_GOVERNANCE_OPERATOR_PG_URL" as const;

let operatorPool: Pool | null = null;
let operatorPoolDatabaseUrl: string | null = null;

export function resolveGovernanceOperatorDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env[GOVERNANCE_OPERATOR_PG_URL_ENV]?.trim() || null;
}

export function resetGovernanceOperatorPgPoolForTests(): void {
  if (operatorPool) void operatorPool.end().catch(() => undefined);
  operatorPool = null;
  operatorPoolDatabaseUrl = null;
}

export function getGovernanceOperatorPgPool(
  env: Record<string, string | undefined> = process.env,
): Pool | null {
  const url = resolveGovernanceOperatorDatabaseUrl(env);
  if (!url) return null;
  if (operatorPool && operatorPoolDatabaseUrl !== url) {
    void operatorPool.end().catch(() => undefined);
    operatorPool = null;
    operatorPoolDatabaseUrl = null;
  }
  if (!operatorPool) {
    operatorPool = new pg.Pool(buildSovereignStagingPoolConfig(url, env));
    operatorPoolDatabaseUrl = url;
  }
  return operatorPool;
}

export async function withGovernanceOperatorPgTransaction<T>(
  run: (client: PoolClient) => Promise<T>,
  env: Record<string, string | undefined> = process.env,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const pool = getGovernanceOperatorPgPool(env);
  if (!pool) return { ok: false, error: "governance_operator_database_unavailable" };
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
