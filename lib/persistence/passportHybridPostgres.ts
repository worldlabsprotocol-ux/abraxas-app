// FILE: lib/persistence/passportHybridPostgres.ts
// Hybrid Passport transaction PostgreSQL binding (PostgREST default + direct pg pool).

import {
  isKnownProductionSupabaseRef,
  supabaseProjectRefFromPostgresUrl,
  supabaseProjectRefFromUrl,
} from "@/lib/supabase/projectRefs";
function persistenceUsesDirectPostgresEnv(
  env: Record<string, string | undefined>,
): boolean {
  const explicit = env.ABRAXAS_PERSISTENCE_BACKEND?.trim().toLowerCase();
  return explicit === "postgres_direct" || explicit === "pg";
}

function passportTransactionPgExplicitlyEnabledEnv(
  env: Record<string, string | undefined>,
): boolean {
  const raw = env.ABRAXAS_PASSPORT_TRANSACTION_PG?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "enabled";
}

function isLocalPostgresHost(databaseUrl: string): boolean {
  try {
    const host = new URL(databaseUrl.trim()).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  } catch {
    return false;
  }
}

export const PASSPORT_HYBRID_PROJECT_REF_ENV = "ABRAXAS_PASSPORT_SUPABASE_PROJECT_REF";
export const PASSPORT_HYBRID_PRODUCTION_AUTHORIZED_ENV =
  "ABRAXAS_PASSPORT_HYBRID_PRODUCTION_AUTHORIZED";

export type PassportHybridPostgresIssueCode =
  | "hybrid_missing_explicit_database_url"
  | "hybrid_postgrest_project_ref_unresolved"
  | "hybrid_direct_project_ref_unresolved"
  | "hybrid_explicit_project_ref_mismatch"
  | "hybrid_postgrest_direct_project_ref_mismatch"
  | "hybrid_production_database_denied";

export type PassportHybridPostgresValidation =
  | { ok: true; postgrest_project_ref: string | null; direct_project_ref: string | null }
  | { ok: false; code: PassportHybridPostgresIssueCode };

/** Hybrid mode only: explicit operator supplied URLs (no MIGRATION_136_PG_URL or generic DATABASE_URL). */
export function resolveHybridPassportExplicitDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return (
    env.ABRAXAS_PASSPORT_DATABASE_URL?.trim()
    ?? env.ABRAXAS_DATABASE_URL?.trim()
    ?? null
  );
}

function resolvePostgrestSupabaseUrl(env: Record<string, string | undefined>): string {
  return (
    env.ABRAXAS_POSTGREST_URL?.trim()
    ?? env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    ?? ""
  );
}

export function validatePassportHybridPostgresBinding(
  env: Record<string, string | undefined> = process.env,
): PassportHybridPostgresValidation {
  const databaseUrl = resolveHybridPassportExplicitDatabaseUrl(env);
  if (!databaseUrl) {
    return { ok: false, code: "hybrid_missing_explicit_database_url" };
  }

  const postgrestRef = supabaseProjectRefFromUrl(resolvePostgrestSupabaseUrl(env));
  const directRef = supabaseProjectRefFromPostgresUrl(databaseUrl);
  const explicitRef = env[PASSPORT_HYBRID_PROJECT_REF_ENV]?.trim() ?? null;

  if (directRef && isKnownProductionSupabaseRef(directRef)) {
    const authorized = env[PASSPORT_HYBRID_PRODUCTION_AUTHORIZED_ENV]?.trim().toLowerCase();
    if (authorized !== "1" && authorized !== "true") {
      return { ok: false, code: "hybrid_production_database_denied" };
    }
  }

  if (explicitRef) {
    if (directRef && directRef !== explicitRef) {
      return { ok: false, code: "hybrid_explicit_project_ref_mismatch" };
    }
    if (postgrestRef && postgrestRef !== explicitRef) {
      return { ok: false, code: "hybrid_explicit_project_ref_mismatch" };
    }
  }

  if (postgrestRef && directRef && postgrestRef !== directRef) {
    return { ok: false, code: "hybrid_postgrest_direct_project_ref_mismatch" };
  }

  if (!directRef && !postgrestRef && !explicitRef) {
    return { ok: false, code: "hybrid_direct_project_ref_unresolved" };
  }

  if (postgrestRef && !directRef && !explicitRef) {
    return { ok: false, code: "hybrid_direct_project_ref_unresolved" };
  }

  if (directRef && !postgrestRef && !explicitRef) {
    return { ok: false, code: "hybrid_postgrest_project_ref_unresolved" };
  }

  if (!directRef && explicitRef && isLocalPostgresHost(databaseUrl)) {
    return {
      ok: true,
      postgrest_project_ref: explicitRef,
      direct_project_ref: explicitRef,
    };
  }

  return {
    ok: true,
    postgrest_project_ref: postgrestRef ?? explicitRef,
    direct_project_ref: directRef ?? explicitRef,
  };
}

/** Operator checklist (no secrets). */
export function passportHybridOperatorConfirmationSteps(): readonly string[] {
  return [
    "Confirm NEXT_PUBLIC_SUPABASE_URL project ref matches db.<ref>.supabase.co or pooler postgres.<ref> in the Passport direct URL.",
    "Set ABRAXAS_PASSPORT_SUPABASE_PROJECT_REF to that ref when validating configuration probes.",
    "Use ABRAXAS_PASSPORT_DATABASE_URL or ABRAXAS_DATABASE_URL only (never MIGRATION_136_PG_URL or generic DATABASE_URL for hybrid).",
    "Production direct hybrid requires ABRAXAS_PASSPORT_HYBRID_PRODUCTION_AUTHORIZED=true after explicit founder review.",
  ] as const;
}

export function passportHybridPostgresConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (persistenceUsesDirectPostgresEnv(env)) return true;
  if (!passportTransactionPgExplicitlyEnabledEnv(env)) return false;
  return validatePassportHybridPostgresBinding(env).ok;
}
