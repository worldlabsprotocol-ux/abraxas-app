#!/usr/bin/env npx tsx
/**
 * Build #558 — observed HTTP boundary probes against deployed staging (not synthetic fixtures).
 */
import { validateStagingPersistentEnv } from "../../lib/sovereignRuntime/sovereignActivationPolicy";

type HttpObservation = {
  route: string;
  method: string;
  status: number;
  ok: boolean;
  classification: "OBSERVED_HTTP" | "UNAVAILABLE";
  detail?: string;
};

async function probe(
  baseUrl: string,
  route: string,
  init: RequestInit,
): Promise<HttpObservation> {
  const url = `${baseUrl.replace(/\/$/, "")}${route}`;
  try {
    const res = await fetch(url, { ...init, redirect: "manual" });
    const ok = res.status >= 200 && res.status < 500;
    return {
      route,
      method: init.method ?? "GET",
      status: res.status,
      ok,
      classification: "OBSERVED_HTTP",
    };
  } catch (error) {
    return {
      route,
      method: init.method ?? "GET",
      status: 0,
      ok: false,
      classification: "UNAVAILABLE",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

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
  const observations: HttpObservation[] = [
    await probe(base, "/api/sovereign/health", { method: "GET" }),
    await probe(base, "/api/auth/passport-evm/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({
        wallet_address: wallet,
        chain_id: 11155111,
        intended_action: "passport_sign_in",
      }),
    }),
    await probe(base, "/api/identity/status", { method: "GET" }),
  ];

  const lifecycleNote =
    "Full lifecycle (consent → capture → admin → receipt → partner) requires authenticated sessions and is not automated here.";
  const allReachable = observations.every((o) => o.classification === "OBSERVED_HTTP" && o.status > 0);
  const healthOk = observations.some(
    (o) => o.route === "/api/sovereign/health" && o.status === 200,
  );

  console.log(
    JSON.stringify(
      {
        build: 558,
        tier: allReachable && healthOk ? "OBSERVED_STAGING_HTTP" : "BLOCKED",
        base_url: base,
        observations,
        synthetic_fixtures_run: false,
        note: lifecycleNote,
      },
      null,
      2,
    ),
  );

  process.exit(allReachable && healthOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
