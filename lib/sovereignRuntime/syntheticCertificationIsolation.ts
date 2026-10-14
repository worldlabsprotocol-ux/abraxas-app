// FILE: lib/sovereignRuntime/syntheticCertificationIsolation.ts
// Fail closed: synthetic DB-mutating certification must never target staging, production, or aliased endpoints.

import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import { collectProductionDeniedRefs } from "@/scripts/demo/lib/demoProjectGuard";
import { assertDistinctPostgresEndpoints, parsePostgresEndpoint } from "./pgConnectionIdentity";
import {
  parseSovereignEnvClass,
  type SovereignActivationIssue,
  validateSovereignDatabaseIdentity,
} from "./sovereignActivationPolicy";
import { SOVEREIGN_STAGING_DATABASE_ID } from "./sovereignStagingConstants";

export const SYNTHETIC_CERTIFICATION_AUTHORIZED_ENV = "ABRAXAS_SYNTHETIC_CERTIFICATION_AUTHORIZED";
export const SYNTHETIC_CERTIFICATION_PG_URL_ENV = "ABRAXAS_SYNTHETIC_CERTIFICATION_PG_URL";

const FORBIDDEN_SYNTHETIC_DATABASE_NAMES = new Set([
  SOVEREIGN_STAGING_DATABASE_ID,
  "abraxas_sovereign_institutional_prod",
]);

export type SyntheticCertificationIsolationReport = {
  ok: boolean;
  database_url_redacted: { host: string; port: number; database: string } | null;
  errors: SovereignActivationIssue[];
};

export function resolveSyntheticCertificationDatabaseUrl(
  env: Record<string, string | undefined>,
): string | null {
  return resolveSyntheticCertificationUrl(env);
}

function resolveSyntheticCertificationUrl(env: Record<string, string | undefined>): string | null {
  return (
    env[SYNTHETIC_CERTIFICATION_PG_URL_ENV]?.trim()
    ?? env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
    ?? env.ABRAXAS_DATABASE_URL?.trim()
    ?? null
  );
}

function urlContainsDeniedProductionRef(url: string, env: Record<string, string | undefined>): SovereignActivationIssue | null {
  const lower = url.toLowerCase();
  for (const ref of Array.from(collectProductionDeniedRefs(env))) {
    if (ref && lower.includes(ref.toLowerCase())) {
      return {
        code: "synthetic_production_ref_denied",
        message: "Synthetic certification database URL must not reference production project refs",
      };
    }
  }
  return null;
}

/** Static isolation — no network I/O. */
export function validateSyntheticCertificationIsolation(
  env: Record<string, string | undefined> = process.env,
): SyntheticCertificationIsolationReport {
  const errors: SovereignActivationIssue[] = [];
  const envClass = parseSovereignEnvClass(env);

  if (envClass !== "disposable") {
    errors.push({
      code: "synthetic_requires_disposable_env",
      message:
        "Synthetic lifecycle and adversarial DB tests require ABRAXAS_SOVEREIGN_ENV_CLASS=disposable (never staging or institutional)",
    });
  }

  const dbId = env.ABRAXAS_SOVEREIGN_DATABASE_ID?.trim();
  if (dbId !== SOVEREIGN_DISPOSABLE_REF) {
    errors.push({
      code: "synthetic_requires_disposable_identity",
      message: `Synthetic certification requires ABRAXAS_SOVEREIGN_DATABASE_ID=${SOVEREIGN_DISPOSABLE_REF}`,
    });
  }

  const identityErr = validateSovereignDatabaseIdentity(env);
  if (identityErr) errors.push(identityErr);

  const url = resolveSyntheticCertificationUrl(env);
  if (!url) {
    errors.push({
      code: "missing_synthetic_database_url",
      message:
        "Set ABRAXAS_SYNTHETIC_CERTIFICATION_PG_URL or disposable ABRAXAS_DATABASE_URL for isolated synthetic certification",
    });
    return { ok: false, database_url_redacted: null, errors };
  }

  const parsed = parsePostgresEndpoint(url);
  if (!parsed.ok) {
    errors.push({ code: parsed.issue.code, message: parsed.issue.message });
    return { ok: false, database_url_redacted: null, errors };
  }

  if (FORBIDDEN_SYNTHETIC_DATABASE_NAMES.has(parsed.endpoint.database)) {
    errors.push({
      code: "synthetic_forbidden_database_name",
      message: "Synthetic certification must not target staging or institutional production database names",
    });
  }

  const prodRefErr = urlContainsDeniedProductionRef(url, env);
  if (prodRefErr) errors.push(prodRefErr);

  const stagingPrimaryUrl = env.ABRAXAS_STAGING_PRIMARY_PG_URL?.trim();
  if (stagingPrimaryUrl) {
    const endpointErr = assertDistinctPostgresEndpoints(stagingPrimaryUrl, url);
    if (endpointErr) {
      errors.push({
        code: "synthetic_aliases_staging_endpoint",
        message: endpointErr.message,
      });
    }
  }

  return {
    ok: errors.length === 0,
    database_url_redacted: parsed.endpoint,
    errors,
  };
}

/** Gate before running vitest or psql mutations. */
export function assertSyntheticCertificationMayRunMutations(
  env: Record<string, string | undefined> = process.env,
): SyntheticCertificationIsolationReport {
  const isolation = validateSyntheticCertificationIsolation(env);
  if (!isolation.ok) return isolation;

  if (env[SYNTHETIC_CERTIFICATION_AUTHORIZED_ENV]?.trim() !== "true") {
    return {
      ok: false,
      database_url_redacted: isolation.database_url_redacted,
      errors: [
        {
          code: "synthetic_certification_not_authorized",
          message: `${SYNTHETIC_CERTIFICATION_AUTHORIZED_ENV}=true is required before synthetic DB-mutating certification`,
        },
      ],
    };
  }

  return isolation;
}
