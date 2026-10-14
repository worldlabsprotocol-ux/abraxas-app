// FILE: lib/sovereignRuntime/stagingOperationalObserved.ts
// Observed signals for operational staging (not configuration-only readiness).

import { accessSync, constants } from "node:fs";
import { createRecoveryPgClient } from "@/lib/databaseRecovery/pgClient";
import { runStagingLifecycleHttpProbes } from "./stagingLifecycleHttpProbes";
import { summarizeStagingHttpTier } from "./stagingHttpProbeSpec";

export type StagingOperationalObserved = {
  database_connectivity: boolean;
  persistent_storage: boolean;
  http_staging_health: boolean;
  detail: {
    postgres_error?: string;
    evidence_root?: "ok" | "missing" | "unreadable";
    http_tier?: string;
  };
};

function evidenceRootOk(root: string | undefined): "ok" | "missing" | "unreadable" {
  if (!root?.trim()) return "missing";
  try {
    accessSync(root.trim(), constants.R_OK | constants.W_OK);
    return "ok";
  } catch {
    return "unreadable";
  }
}

export async function observeStagingOperationalSignals(input: {
  databaseUrl: string | null;
  evidenceRoot: string | undefined;
  httpBase: string | undefined;
  env?: Record<string, string | undefined>;
}): Promise<StagingOperationalObserved> {
  const detail: StagingOperationalObserved["detail"] = {};
  let database_connectivity = false;
  let persistent_storage = false;
  let http_staging_health = false;

  if (input.databaseUrl) {
    try {
      const client = await createRecoveryPgClient({
        databaseUrl: input.databaseUrl,
        env: input.env,
      });
      try {
        await client.query("select 1 as ok");
        database_connectivity = true;
      } finally {
        await client.end();
      }
    } catch (error) {
      detail.postgres_error = error instanceof Error ? error.message : String(error);
    }
  }

  const evidenceStatus = evidenceRootOk(input.evidenceRoot);
  detail.evidence_root = evidenceStatus;
  persistent_storage = evidenceStatus === "ok";

  if (input.httpBase?.trim()) {
    const probes = await runStagingLifecycleHttpProbes(input.httpBase.trim());
    const smoke = summarizeStagingHttpTier(
      probes.filter((p) => p.id === "sovereign_health" || p.id === "passport_evm_challenge"),
    );
    detail.http_tier = smoke.tier;
    http_staging_health = smoke.tier === "OBSERVED_STAGING_HTTP";
  }

  return {
    database_connectivity,
    persistent_storage,
    http_staging_health,
    detail,
  };
}
