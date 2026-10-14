#!/usr/bin/env npx tsx
/**
 * Build #558 — observed HTTP boundary probes against deployed staging (not synthetic fixtures).
 */
import { validateStagingPersistentEnv } from "../../lib/sovereignRuntime/sovereignActivationPolicy";
import {
  evaluateStagingHttpProbe,
  STAGING_HTTP_SMOKE_PROBES,
  summarizeStagingHttpTier,
} from "../../lib/sovereignRuntime/stagingHttpProbeSpec";

async function main(): Promise<void> {
  const env = process.env;
  const config = validateStagingPersistentEnv(env);
  const base = env.ABRAXAS_STAGING_HTTP_BASE_URL?.trim();

  if (!base) {
    console.error(
      JSON.stringify(
        {
          build: 558,
          tier: "BLOCKED",
          full_protocol_lifecycle_certified: false,
          error: "ABRAXAS_STAGING_HTTP_BASE_URL is required for observed HTTP certification",
          config_ok: config.ok,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  if (!config.ok) {
    console.error(
      JSON.stringify(
        {
          build: 558,
          tier: "BLOCKED",
          full_protocol_lifecycle_certified: false,
          staging_config: config,
          note: "Fix staging env before HTTP observation.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const wallet = "0x0000000000000000000000000000000000000001";
  const results = [];

  for (const spec of STAGING_HTTP_SMOKE_PROBES) {
    const url = `${base.replace(/\/$/, "")}${spec.route}`;
    try {
      const init: RequestInit =
        spec.method === "POST"
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json", Origin: base.replace(/\/$/, "") },
              body: JSON.stringify({
                wallet_address: wallet,
                chain_id: 11155111,
                intended_action: "passport_sign_in",
              }),
              redirect: "manual",
            }
          : { method: "GET", redirect: "manual" };

      const res = await fetch(url, init);
      const bodyText = await res.text();
      results.push(
        evaluateStagingHttpProbe({
          spec,
          status: res.status,
          headers: res.headers,
          bodyText,
        }),
      );
    } catch (error) {
      results.push(
        evaluateStagingHttpProbe({
          spec,
          status: 0,
          headers: new Headers(),
          bodyText: "",
          fetchError: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  const summary = summarizeStagingHttpTier(results);

  console.log(
    JSON.stringify(
      {
        build: 558,
        tier: summary.tier,
        full_protocol_lifecycle_certified: summary.full_protocol_lifecycle_certified,
        base_url: base,
        probes: results,
        synthetic_fixtures_run: false,
        note:
          "Smoke probes only. Full lifecycle (wallet verify → consent → capture → admin → receipt → partner) is not certified here.",
      },
      null,
      2,
    ),
  );

  process.exit(summary.tier === "OBSERVED_STAGING_HTTP" ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
