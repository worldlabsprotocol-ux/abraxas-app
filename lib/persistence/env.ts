// FILE: lib/persistence/env.ts

import type { PersistenceConfig } from "./types";

/**
 * Resolve Abraxas persistence connectivity.
 * Supabase-hosted Postgres uses PostgREST URL + service role key.
 * Independent Postgres may set ABRAXAS_DATABASE_URL for migration/tests;
 * runtime PostgREST remains the default adapter until direct pg pool is wired.
 */
export function resolvePersistenceConfig(
  env: Record<string, string | undefined> = process.env,
): PersistenceConfig {
  const postgrestUrl = env.ABRAXAS_POSTGREST_URL?.trim()
    ?? env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    ?? "";
  const serviceRoleKey = env.ABRAXAS_DB_SERVICE_ROLE_KEY?.trim()
    ?? env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ?? "";

  if (!postgrestUrl || !serviceRoleKey) {
    return { ok: false, code: "persistence_not_configured" };
  }

  return {
    ok: true,
    backend: "supabase_postgrest",
    postgrestUrl,
    serviceRoleKey,
  };
}

export function resolveIndependentPostgresUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.ABRAXAS_DATABASE_URL?.trim()
    ?? env.MIGRATION_136_PG_URL?.trim()
    ?? env.DATABASE_URL?.trim()
    ?? null;
}
