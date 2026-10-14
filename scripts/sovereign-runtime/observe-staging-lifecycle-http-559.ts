#!/usr/bin/env npx tsx
/**
 * Build #559 — observed HTTP lifecycle boundary probes (not full authenticated E2E).
 */
import { validateStagingPersistentEnv } from "../../lib/sovereignRuntime/sovereignActivationPolicy";
import {
  lifecycleHttpObservedOk,
  runStagingLifecycleHttpProbes,
} from "../../lib/sovereignRuntime/stagingLifecycleHttpProbes";

async function main(): Promise<void> {
  const env = process.env;
  const base = env.ABRAXAS_STAGING_HTTP_BASE_URL?.trim();
  const config = validateStagingPersistentEnv(env);

  if (!base) {
    console.error(JSON.stringify({ build: 559, tier: "BLOCKED", error: "ABRAXAS_STAGING_HTTP_BASE_URL required" }, null, 2));
    process.exit(1);
  }
  if (!config.ok) {
    console.error(JSON.stringify({ build: 559, tier: "BLOCKED", staging_config: config }, null, 2));
    process.exit(1);
  }

  const probes = await runStagingLifecycleHttpProbes(base);
  const ok = lifecycleHttpObservedOk(probes);

  console.log(
    JSON.stringify(
      {
        build: 559,
        tier: ok ? "OBSERVED_LIFECYCLE_HTTP_BOUNDARIES" : "BLOCKED",
        full_protocol_lifecycle_certified: false,
        base_url: base,
        probes,
        note:
          "Observed fail-closed and challenge routes only. Consent→receipt→partner E2E requires authenticated staging sessions.",
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
