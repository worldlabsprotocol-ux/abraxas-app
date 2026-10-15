// FILE: lib/persistence/disposablePgMigrationTestGuard.ts
// Authorize disposable PostgreSQL migration tests only (never Production inference from URL alone).

import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import {
  assertRefNotProductionTarget,
  collectProductionDeniedRefs,
} from "@/scripts/demo/lib/demoProjectGuard";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";

export const DISPOSABLE_PG_TEST_DATABASE_ID_ENV = "ABRAXAS_DISPOSABLE_PG_TEST_DATABASE_ID";
export const DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV = "ABRAXAS_DISPOSABLE_PG_MIGRATION_AUTHORIZED";
export const DISPOSABLE_PG_TEST_URL_ENV = "ABRAXAS_DISPOSABLE_PG_TEST_URL";

export type DisposablePgMigrationGuardResult =
  | { ok: true; databaseUrl: string }
  | { ok: false; reason: string };

export function evaluateDisposablePgMigrationTestGuard(
  env: Record<string, string | undefined> = process.env,
): DisposablePgMigrationGuardResult {
  if (env.ABRAXAS_SOVEREIGN_ENV_CLASS?.trim().toLowerCase() !== "disposable") {
    return {
      ok: false,
      reason: "ABRAXAS_SOVEREIGN_ENV_CLASS must be disposable for migration tests",
    };
  }

  const testId = env[DISPOSABLE_PG_TEST_DATABASE_ID_ENV]?.trim();
  if (!testId || testId !== SOVEREIGN_DISPOSABLE_REF) {
    return {
      ok: false,
      reason: `Set ${DISPOSABLE_PG_TEST_DATABASE_ID_ENV}=${SOVEREIGN_DISPOSABLE_REF}`,
    };
  }

  if (env[DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV]?.trim().toLowerCase() !== "true") {
    return {
      ok: false,
      reason: `Set ${DISPOSABLE_PG_MIGRATION_AUTHORIZED_ENV}=true after explicit review`,
    };
  }

  const databaseUrl = env[DISPOSABLE_PG_TEST_URL_ENV]?.trim();
  if (!databaseUrl) {
    return {
      ok: false,
      reason: `Set ${DISPOSABLE_PG_TEST_URL_ENV} to an authorized disposable database (not inferred from DATABASE_URL)`,
    };
  }

  const pgRef = supabaseProjectRefFromPostgresUrl(databaseUrl);
  if (pgRef) {
    try {
      assertRefNotProductionTarget(pgRef, collectProductionDeniedRefs(env));
    } catch {
      return { ok: false, reason: "Disposable migration test URL targets a denied production Supabase ref" };
    }
  }

  const lowered = databaseUrl.toLowerCase();
  if (lowered.includes("abraxasworld") || lowered.includes("production")) {
    return { ok: false, reason: "Disposable migration test URL appears to name a production target" };
  }

  return { ok: true, databaseUrl };
}
