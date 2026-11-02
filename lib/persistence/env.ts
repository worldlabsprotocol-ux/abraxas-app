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

/** Legacy activation flag retained for deployment compatibility. */
export const PASSPORT_TRANSACTION_PG_ENV = "ABRAXAS_PASSPORT_TRANSACTION_PG";

export function passportTransactionPgExplicitlyEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[PASSPORT_TRANSACTION_PG_ENV]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "enabled";
}

/**
 * Abraxas-owned PostgreSQL URL for the complete Passport trust path.
 *
 * Passport does not derive its persistence authority from the global PostgREST
 * adapter. An explicit Passport URL is authoritative even while unrelated
 * legacy product surfaces continue to use the global backend during cutover.
 */
export function resolvePassportDirectPostgresUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const passportUrl = env.ABRAXAS_PASSPORT_DATABASE_URL?.trim();
  if (passportUrl) return passportUrl;
  if (persistenceUsesDirectPostgres(env)) {
    return resolveIndependentPostgresUrl(env);
  }
  return null;
}

export type PassportSovereignPostgresValidation =
  | { ok: true; databaseUrl: string }
  | { ok: false; code: "passport_database_url_missing" | "passport_supabase_host_rejected" };

/** Fail closed when Passport is not bound to Abraxas-controlled PostgreSQL. */
export function validatePassportSovereignPostgresBinding(
  env: Record<string, string | undefined> = process.env,
): PassportSovereignPostgresValidation {
  const databaseUrl = resolvePassportDirectPostgresUrl(env);
  if (!databaseUrl) return { ok: false, code: "passport_database_url_missing" };
  try {
    const host = new URL(databaseUrl.replace(/^postgres(ql)?:\/\//, "https://")).hostname.toLowerCase();
    if (host === "supabase.co" || host.endsWith(".supabase.co")) {
      return { ok: false, code: "passport_supabase_host_rejected" };
    }
  } catch {
    // Permit local socket / libpq connection strings; pg validates them at connection time.
  }
  return { ok: true, databaseUrl };
}

/**
 * Passport challenge, identity, consent, receipt, and authorization paths use
 * direct PostgreSQL whenever their explicit sovereign binding is configured.
 */
export function isPassportDirectPostgresEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return validatePassportSovereignPostgresBinding(env).ok;
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
