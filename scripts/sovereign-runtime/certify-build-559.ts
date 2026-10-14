#!/usr/bin/env npx tsx
/**
 * Build #559 — sovereign staging deployment certification orchestrator.
 * Executes only authorized, non-destructive checks. Never claims human IDV or Production.
 */
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { buildStagingInfraInventory } from "../../lib/sovereignRuntime/stagingInfraInventory";
import {
  deriveOperationalStagingTier,
  type Build559CertificationSummary,
} from "../../lib/sovereignRuntime/stagingCertificationTiers";
import { validateStagingPersistentEnv } from "../../lib/sovereignRuntime/sovereignActivationPolicy";
import {
  lifecycleHttpObservedOk,
  runStagingLifecycleHttpProbes,
} from "../../lib/sovereignRuntime/stagingLifecycleHttpProbes";
import { summarizeStagingHttpTier } from "../../lib/sovereignRuntime/stagingHttpProbeSpec";

function runVitest(pattern: string): boolean {
  try {
    execFileSync("./node_modules/.bin/vitest", ["run", ...pattern.split(/\s+/).filter(Boolean)], {
      stdio: "inherit",
      env: process.env,
    });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const env = process.env;
  const t0 = performance.now();
  const inventory = buildStagingInfraInventory(env);
  const stagingEnv = validateStagingPersistentEnv(env);

  const inventoryComplete =
    inventory.persistence_backend === "postgres_direct"
    && inventory.evidence_storage_root_set
    && inventory.signing_key_configured
    && inventory.primary_postgres !== null
    && inventory.restore_postgres !== null
    && inventory.backup_encryption_key_configured
    && inventory.backup_output_dir_set
    && inventory.backup_scope === "sovereign";

  const operational = deriveOperationalStagingTier({
    staging_persistent_ready: stagingEnv.ok,
    inventory_complete: inventoryComplete,
  });

  let observedHttp: Build559CertificationSummary["observed_staging_http"] = "BLOCKED";
  let lifecycleHttp: { tier: string; probes?: unknown[] } = { tier: "BLOCKED" };
  const httpBase = env.ABRAXAS_STAGING_HTTP_BASE_URL?.trim();

  if (httpBase && stagingEnv.ok) {
    const smokeProbes = await runStagingLifecycleHttpProbes(httpBase);
    const smokeSummary = summarizeStagingHttpTier(
      smokeProbes.filter((p) => p.id === "sovereign_health" || p.id === "passport_evm_challenge"),
    );
    observedHttp = smokeSummary.tier === "OBSERVED_STAGING_HTTP" ? "OBSERVED_STAGING_HTTP" : "BLOCKED";
    const boundaryOk = lifecycleHttpObservedOk(smokeProbes);
    lifecycleHttp = {
      tier: boundaryOk ? "OBSERVED_LIFECYCLE_HTTP_BOUNDARIES" : "BLOCKED",
      probes: smokeProbes,
    };
  }

  let syntheticLifecycle: Build559CertificationSummary["full_protocol_lifecycle"] = "BLOCKED";
  let adversarial: Build559CertificationSummary["adversarial_trust"] = "BLOCKED";
  const pg = env.ABRAXAS_DATABASE_URL?.trim() || env.ABRAXAS_SOVEREIGN_PG_URL?.trim();
  const envClass = inventory.sovereign_env_class;

  if (pg && envClass === "disposable") {
    const synthOk = runVitest("lib/persistence/build556.sovereignCertification.test.ts");
    const advOk = runVitest("lib/persistence/build555Security.adversarial.test.ts");
    syntheticLifecycle = synthOk ? "SYNTHETIC_LIFECYCLE_CERTIFIED" : "BLOCKED";
    adversarial = advOk ? "PASS" : synthOk ? "FAIL" : "BLOCKED";
  } else if (pg && envClass === "staging" && stagingEnv.ok) {
    const synthOk = runVitest("lib/persistence/build556.sovereignCertification.test.ts");
    const advOk = runVitest("lib/persistence/build555Security.adversarial.test.ts");
    syntheticLifecycle = synthOk ? "SYNTHETIC_LIFECYCLE_CERTIFIED" : "BLOCKED";
    adversarial = advOk ? "PASS" : synthOk ? "FAIL" : "BLOCKED";
  }

  let recovery: Build559CertificationSummary["recovery_proof"] = "BLOCKED";
  if (
    stagingEnv.ok
    && env.ABRAXAS_BACKUP_MANIFEST_PATH?.trim()
    && env.ABRAXAS_SOVEREIGN_STAGING_RESTORE_DRILL_AUTHORIZED === "true"
  ) {
    try {
      execFileSync("npm", ["run", "sovereign-runtime:restore-drill-staging-558"], {
        stdio: "pipe",
        env,
      });
      recovery = "RECOVERY_DRILL_VERIFIED";
    } catch {
      recovery = "BLOCKED";
    }
  }

  // Full deployed lifecycle (consent → partner receipt consumption) is not automated in #559.
  const fullProtocol: Build559CertificationSummary["full_protocol_lifecycle"] =
    syntheticLifecycle === "SYNTHETIC_LIFECYCLE_CERTIFIED" ? "SYNTHETIC_LIFECYCLE_CERTIFIED" : "BLOCKED";

  const summary: Build559CertificationSummary = {
    build: 559,
    operational_staging: operational,
    observed_staging_http: observedHttp,
    full_protocol_lifecycle: fullProtocol,
    adversarial_trust: adversarial,
    recovery_proof: recovery,
    synthetic_fixtures_used: syntheticLifecycle !== "BLOCKED",
    human_idv_claimed: false,
    production_readiness_claimed: false,
  };

  console.log(
    JSON.stringify(
      {
        ...summary,
        elapsed_ms: Math.round(performance.now() - t0),
        inventory,
        staging_env: stagingEnv,
        lifecycle_http: lifecycleHttp,
        limitations: [
          "FULL_PROTOCOL_LIFECYCLE_CERTIFIED requires operational staging + observed HTTP + synthetic PG certification + recovery drill.",
          "Synthetic fixtures are not human IDV.",
          "Authenticated receipt/partner consumption on deployed staging requires founder-provisioned ABRAXAS_STAGING_HTTP_BASE_URL and staging env class.",
        ],
      },
      null,
      2,
    ),
  );

  process.exit(summary.operational_staging === "OPERATIONAL_STAGING" ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
