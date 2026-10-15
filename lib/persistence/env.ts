// FILE: lib/persistence/env.ts

import type { PersistenceBackend, PersistenceConfig } from "./types";

/**
 * Resolve Abraxas persistence connectivity.
 * Supabase-hosted Postgres uses PostgREST URL + service role key.
 * Independent Postgres may set ABRAXAS_DATABASE_URL for migration/tests;
 * runtime PostgREST remains the default adapter until direct pg pool is wired.
 */
export function resolvePersistenceBackend(
  env: Record<string, string | undefined> = process.env,
): PersistenceBackend {
  const explicit = env.ABRAXAS_PERSISTENCE_BACKEND?.trim().toLowerCase();
  if (explicit === "postgres_direct" || explicit === "pg") return "postgres_direct";
  if (
    explicit === "postgrest"
    || explicit === "supabase_postgrest"
    || explicit === "supabase"
  ) {
    return "supabase_postgrest";
  }
  return "supabase_postgrest";
}

export function persistenceUsesDirectPostgres(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return resolvePersistenceBackend(env) === "postgres_direct";
}

/** Enables transaction sensitive Passport paths via direct pg while default transport stays PostgREST. */
export const PASSPORT_TRANSACTION_PG_ENV = "ABRAXAS_PASSPORT_TRANSACTION_PG";

export function passportTransactionPgExplicitlyEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[PASSPORT_TRANSACTION_PG_ENV]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "enabled";
}

/** Direct PostgreSQL URL for Passport transaction stores (may target existing Supabase Postgres). */
export function resolvePassportDirectPostgresUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return (
    env.ABRAXAS_PASSPORT_DATABASE_URL?.trim()
    ?? resolveIndependentPostgresUrl(env)
  );
}

/**
 * Passport reusable credential, consent, and authorization commit paths use `queryAbraxasPg`.
 * True when globally postgres_direct, or hybrid: PostgREST default + explicit passport transaction pg.
 */
export function isPassportDirectPostgresEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const url = resolvePassportDirectPostgresUrl(env);
  if (!url) return false;
  if (persistenceUsesDirectPostgres(env)) return true;
  return passportTransactionPgExplicitlyEnabled(env);
}

export function resolvePersistenceConfig(
  env: Record<string, string | undefined> = process.env,
): PersistenceConfig {
  const backend = resolvePersistenceBackend(env);

  if (backend === "postgres_direct") {
    const databaseUrl = resolveIndependentPostgresUrl(env);
    if (!databaseUrl) {
      return { ok: false, code: "persistence_not_configured" };
    }
    return {
      ok: true,
      backend: "postgres_direct",
      postgrestUrl: "",
      serviceRoleKey: "",
      databaseUrl,
    };
  }

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
