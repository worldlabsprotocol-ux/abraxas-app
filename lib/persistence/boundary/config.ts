// FILE: lib/persistence/boundary/config.ts

import { parseSovereignEnvClass } from "@/lib/sovereignRuntime/sovereignActivationPolicy";
import { resolvePersistenceBackend } from "@/lib/persistence/env";
import type { PersistenceAuthorityRole, ShadowPersistenceMode } from "./types";

export const SHADOW_PERSISTENCE_COMPARE_ENV = "ABRAXAS_SHADOW_PERSISTENCE_COMPARE" as const;
export const SOVEREIGN_STAGING_PG_URL_ENV = "ABRAXAS_SOVEREIGN_STAGING_PG_URL" as const;

export type PersistenceBoundaryConfig = {
  authorityRole: PersistenceAuthorityRole;
  shadowMode: ShadowPersistenceMode;
  persistenceBackend: ReturnType<typeof resolvePersistenceBackend>;
  sovereignStagingDatabaseUrl: string | null;
  productionLegacyActive: boolean;
};

function shadowModeFromEnv(env: Record<string, string | undefined>): ShadowPersistenceMode {
  const raw = env[SHADOW_PERSISTENCE_COMPARE_ENV]?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "compare") return "compare";
  return "off";
}

export function resolvePersistenceBoundaryConfig(
  env: Record<string, string | undefined> = process.env,
): PersistenceBoundaryConfig {
  const envClass = parseSovereignEnvClass(env);
  const shadowMode = shadowModeFromEnv(env);
  const backend = resolvePersistenceBackend(env);
  const sovereignUrl =
    env[SOVEREIGN_STAGING_PG_URL_ENV]?.trim()
    ?? (envClass === "staging" ? env.ABRAXAS_DATABASE_URL?.trim() : null)
    ?? null;

  const isProductionRuntime =
    env.NODE_ENV === "production"
    && envClass !== "staging"
    && envClass !== "disposable";

  let authorityRole: PersistenceAuthorityRole = "production_legacy";
  if (shadowMode === "compare") {
    authorityRole = "shadow_observer";
  } else if (envClass === "staging" || envClass === "disposable") {
    authorityRole = "sovereign_staging";
  }

  return {
    authorityRole,
    shadowMode,
    persistenceBackend: backend,
    sovereignStagingDatabaseUrl: sovereignUrl,
    productionLegacyActive: isProductionRuntime || authorityRole === "production_legacy",
  };
}
