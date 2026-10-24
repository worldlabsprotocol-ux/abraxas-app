// FILE: lib/persistence/boundary/isolationGuard.ts
// Fail closed: sovereign staging must not share Production authority or endpoint.

import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";
import { parsePostgresEndpoint, postgresEndpointsEqual } from "@/lib/sovereignRuntime/pgConnectionIdentity";
import { parseSovereignEnvClass } from "@/lib/sovereignRuntime/sovereignActivationPolicy";
import { SHADOW_PERSISTENCE_COMPARE_ENV, SOVEREIGN_STAGING_PG_URL_ENV } from "./config";

export type SovereignIsolationIssue = { code: string; message: string };

export function assertNotProductionSupabaseProject(
  databaseUrl: string | undefined | null,
): SovereignIsolationIssue | null {
  const ref = supabaseProjectRefFromPostgresUrl(databaseUrl ?? "");
  if (ref === PRODUCTION_SUPABASE_PROJECT_REF) {
    return {
      code: "production_supabase_ref_forbidden",
      message: `Production Supabase project ${PRODUCTION_SUPABASE_PROJECT_REF} cannot be sovereign staging target`,
    };
  }
  return null;
}

/** Shadow compare is read-only with respect to Production — no second writer. */
export function evaluateShadowPersistenceIsolation(
  env: Record<string, string | undefined> = process.env,
): { ok: true } | { ok: false; issues: SovereignIsolationIssue[] } {
  const issues: SovereignIsolationIssue[] = [];
  const shadowRaw = env[SHADOW_PERSISTENCE_COMPARE_ENV]?.trim().toLowerCase();
  const shadowOn = shadowRaw === "1" || shadowRaw === "true" || shadowRaw === "compare";

  const sovereignUrl =
    env[SOVEREIGN_STAGING_PG_URL_ENV]?.trim() ?? env.ABRAXAS_DATABASE_URL?.trim() ?? null;

  if (shadowOn) {
    const envClass = parseSovereignEnvClass(env);
    if (envClass !== "staging" && envClass !== "disposable") {
      issues.push({
        code: "shadow_requires_staging_class",
        message: "ABRAXAS_SHADOW_PERSISTENCE_COMPARE requires ABRAXAS_SOVEREIGN_ENV_CLASS=staging or disposable",
      });
    }
    if (env.ABRAXAS_SOVEREIGN_STAGING_WRITES?.trim().toLowerCase() === "true") {
      issues.push({
        code: "shadow_forbids_staging_writes_flag",
        message: "Shadow compare cannot run with ABRAXAS_SOVEREIGN_STAGING_WRITES=true",
      });
    }
  }

  if (sovereignUrl) {
    const prodRef = assertNotProductionSupabaseProject(sovereignUrl);
    if (prodRef) issues.push(prodRef);
  }

  const legacyPgHint =
    env.SUPABASE_DB_URL?.trim()
    ?? env.DATABASE_URL?.trim()
    ?? null;
  if (sovereignUrl && legacyPgHint) {
    const a = parsePostgresEndpoint(sovereignUrl);
    const b = parsePostgresEndpoint(legacyPgHint);
    if (a.ok && b.ok && postgresEndpointsEqual(a.endpoint, b.endpoint)) {
      issues.push({
        code: "sovereign_must_not_share_production_endpoint",
        message:
          "Sovereign staging database endpoint must differ from Production DATABASE_URL (host, port, database)",
      });
    }
  }

  if (issues.length) return { ok: false, issues };
  return { ok: true };
}

export function assertSovereignStagingWriteAllowed(
  env: Record<string, string | undefined> = process.env,
): void {
  const isolation = evaluateShadowPersistenceIsolation(env);
  if (!isolation.ok) {
    throw new Error(`sovereign_write_forbidden:${isolation.issues[0]?.code ?? "unknown"}`);
  }
  const shadowRaw = env[SHADOW_PERSISTENCE_COMPARE_ENV]?.trim().toLowerCase();
  if (shadowRaw === "1" || shadowRaw === "true" || shadowRaw === "compare") {
    throw new Error("sovereign_write_forbidden:shadow_compare_read_only");
  }
  const envClass = parseSovereignEnvClass(env);
  if (envClass !== "staging" && envClass !== "disposable") {
    throw new Error("sovereign_write_forbidden:not_staging_env");
  }
  const fixtureWrites = env.ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES?.trim().toLowerCase();
  if (envClass === "disposable" && fixtureWrites !== "true") {
    throw new Error("sovereign_write_forbidden:disposable_requires_fixture_writes_flag");
  }
}
