// FILE: lib/persistence/passportHybridPostgres.ts
// Hybrid Passport transaction PostgreSQL binding (PostgREST default + direct pg pool).

import {
  isKnownProductionSupabaseRef,
  KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS,
  supabaseProjectRefFromPostgresUrl,
  supabaseProjectRefFromUrl,
} from "@/lib/supabase/projectRefs";
import {
  DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV,
  DISPOSABLE_PG_TEST_DATABASE_ID_ENV,
  DISPOSABLE_PG_TEST_URL_ENV,
  SOVEREIGN_DISPOSABLE_DATABASE_ID,
} from "./disposablePgTestEnv";

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
export const DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV =
  "ABRAXAS_DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED";

export type PassportHybridBindingMode = "supabase_dual_identity" | "disposable_local_test";

export type PassportHybridPostgresIssueCode =
  | "hybrid_missing_explicit_database_url"
  | "hybrid_postgrest_project_ref_unresolved"
  | "hybrid_direct_project_ref_unresolved"
  | "hybrid_explicit_project_ref_mismatch"
  | "hybrid_postgrest_direct_project_ref_mismatch"
  | "hybrid_production_database_denied";

export type PassportHybridPostgresValidation =
  | {
      ok: true;
      binding_mode: PassportHybridBindingMode;
      postgrest_project_ref: string;
      direct_project_ref: string;
    }
  | {
      ok: true;
      binding_mode: "disposable_local_test";
      postgrest_project_ref: null;
      direct_project_ref: null;
    }
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

function productionHybridAuthorizationGranted(env: Record<string, string | undefined>): boolean {
  const authorized = env[PASSPORT_HYBRID_PRODUCTION_AUTHORIZED_ENV]?.trim().toLowerCase();
  return authorized === "1" || authorized === "true";
}

function hybridProductionDeniedRefs(env: Record<string, string | undefined>): Set<string> {
  const denied = new Set<string>(KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS as readonly string[]);
  const configuredProductionRef = env.PRODUCTION_SUPABASE_PROJECT_REF?.trim();
  if (configuredProductionRef) denied.add(configuredProductionRef);
  const extra = env.DEMO_DENIED_SUPABASE_PROJECT_REFS?.split(",") ?? [];
  for (const part of extra) {
    const trimmed = part.trim();
    if (trimmed) denied.add(trimmed);
  }
  return denied;
}

/** Resolved Supabase ref targets Production (deny list, configured production ref, or deployed production project). */
export function resolvedRefRequiresProductionHybridAuthorization(
  ref: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (hybridProductionDeniedRefs(env).has(ref)) return true;
  const configuredProductionRef = env.PRODUCTION_SUPABASE_PROJECT_REF?.trim();
  if (configuredProductionRef && ref === configuredProductionRef) return true;
  if (isKnownProductionSupabaseRef(ref)) return true;
  if (env.VERCEL_ENV?.trim() === "production") {
    const deployedPostgrestRef = supabaseProjectRefFromUrl(resolvePostgrestSupabaseUrl(env));
    if (deployedPostgrestRef && ref === deployedPostgrestRef) return true;
  }
  return false;
}

function validateOperatorAttestationCrossCheck(input: {
  explicitRef: string | null;
  postgrestRef: string | null;
  directRef: string | null;
}): PassportHybridPostgresIssueCode | null {
  if (!input.explicitRef) return null;
  if (input.postgrestRef && input.postgrestRef !== input.explicitRef) {
    return "hybrid_explicit_project_ref_mismatch";
  }
  if (input.directRef && input.directRef !== input.explicitRef) {
    return "hybrid_explicit_project_ref_mismatch";
  }
  return null;
}

function tryValidateDisposableLocalHybridBinding(
  env: Record<string, string | undefined>,
  databaseUrl: string,
): PassportHybridPostgresValidation | null {
  if (env.ABRAXAS_SOVEREIGN_ENV_CLASS?.trim().toLowerCase() !== "disposable") return null;
  if (!isLocalPostgresHost(databaseUrl)) return null;
  if (env[DISPOSABLE_PG_TEST_DATABASE_ID_ENV]?.trim() !== SOVEREIGN_DISPOSABLE_DATABASE_ID) {
    return null;
  }
  if (env[DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]?.trim().toLowerCase() !== "true") return null;
  if (env[DISPOSABLE_PG_HYBRID_LOCAL_AUTHORIZED_ENV]?.trim().toLowerCase() !== "true") return null;
  const authorizedUrl = env[DISPOSABLE_PG_TEST_URL_ENV]?.trim();
  if (!authorizedUrl || authorizedUrl !== databaseUrl.trim()) return null;
  return {
    ok: true,
    binding_mode: "disposable_local_test",
    postgrest_project_ref: null,
    direct_project_ref: null,
  };
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

  const attestationError = validateOperatorAttestationCrossCheck({
    explicitRef,
    postgrestRef,
    directRef,
  });
  if (attestationError) {
    return { ok: false, code: attestationError };
  }

  const disposableLocal = tryValidateDisposableLocalHybridBinding(env, databaseUrl);
  if (disposableLocal) {
    return disposableLocal;
  }

  if (!postgrestRef) {
    return { ok: false, code: "hybrid_postgrest_project_ref_unresolved" };
  }
  if (!directRef) {
    return { ok: false, code: "hybrid_direct_project_ref_unresolved" };
  }
  if (postgrestRef !== directRef) {
    return { ok: false, code: "hybrid_postgrest_direct_project_ref_mismatch" };
  }

  if (
    resolvedRefRequiresProductionHybridAuthorization(postgrestRef, env)
    && !productionHybridAuthorizationGranted(env)
  ) {
    return { ok: false, code: "hybrid_production_database_denied" };
  }

  return {
    ok: true,
    binding_mode: "supabase_dual_identity",
    postgrest_project_ref: postgrestRef,
    direct_project_ref: directRef,
  };
}

/** Operator checklist (no secrets). */
export function passportHybridOperatorConfirmationSteps(): readonly string[] {
  return [
    "Parse project ref independently from NEXT_PUBLIC_SUPABASE_URL and from the Passport direct Postgres URL hostname.",
    "Both refs must match before hybrid binding is verified; ABRAXAS_PASSPORT_SUPABASE_PROJECT_REF is a cross-check only.",
    "Use ABRAXAS_PASSPORT_DATABASE_URL or ABRAXAS_DATABASE_URL only (never MIGRATION_136_PG_URL or generic DATABASE_URL for hybrid).",
    "Production targets require ABRAXAS_PASSPORT_HYBRID_PRODUCTION_AUTHORIZED=true after explicit founder review.",
  ] as const;
}

export function passportHybridPostgresConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (persistenceUsesDirectPostgresEnv(env)) return true;
  if (!passportTransactionPgExplicitlyEnabledEnv(env)) return false;
  return validatePassportHybridPostgresBinding(env).ok;
}
