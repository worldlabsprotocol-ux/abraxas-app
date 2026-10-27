#!/usr/bin/env npx tsx
/**
 * Build 878 — probe deployed hosts (SHA, wallet gate). No invented journey timings.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const artifactDir = resolve("/opt/cursor/artifacts/build-878");
const expectedMainSha = process.env.BUILD878_EXPECTED_MAIN_SHA?.trim() || "e361fd7371d2a41996109f013e2e59e4b2a0a7b1";

const hosts = [
  ...new Set(
    [
      process.env.LAUNCHPAD_STAGING_URL?.trim(),
      process.env.DEMO_PUBLIC_URL?.trim() || "https://demo.abraxasworld.xyz",
      process.env.PRODUCTION_PUBLIC_URL?.trim() || "https://abraxasworld.xyz",
    ].filter(Boolean) as string[],
  ),
];

type HostProbe = {
  host: string;
  http_status_home: number | null;
  commit_sha: string | null;
  staging_identity_ok: boolean;
  wallet_operational: boolean;
  wallet_enabled: boolean;
  matches_expected_main_sha: boolean | null;
  unified_handoff_reachable: boolean;
  notes: string[];
};

async function probeHost(host: string): Promise<HostProbe> {
  const base = host.replace(/\/$/, "");
  const notes: string[] = [];
  let httpStatusHome: number | null = null;
  let commitSha: string | null = null;
  let stagingIdentityOk = false;
  let walletOperational = false;
  let walletEnabled = false;
  let unifiedHandoffReachable = false;

  try {
    const home = await fetch(`${base}/`, { redirect: "follow" });
    httpStatusHome = home.status;
  } catch {
    notes.push("home_fetch_failed");
  }

  try {
    const envRes = await fetch(`${base}/api/launchpad/staging/environment`, { cache: "no-store" });
    if (envRes.ok) {
      stagingIdentityOk = true;
      const body = (await envRes.json()) as { commit_sha?: string };
      commitSha = body.commit_sha ?? null;
    } else if (envRes.status === 404) {
      notes.push("staging_identity_not_exposed");
    }
  } catch {
    notes.push("staging_identity_fetch_failed");
  }

  try {
    const walletRes = await fetch(`${base}/api/auth/wallet/enabled`, { cache: "no-store" });
    if (walletRes.ok) {
      const body = (await walletRes.json()) as { operational?: boolean; enabled?: boolean };
      walletOperational = body.operational === true;
      walletEnabled = body.enabled === true;
    }
  } catch {
    notes.push("wallet_enabled_fetch_failed");
  }

  try {
    const handoff = await fetch(
      `${base}/developers/ephemeral-sandbox?integration=1&source=developer-workspace&pack=wallet_control&step=create_sandbox`,
      { redirect: "follow" },
    );
    unifiedHandoffReachable = handoff.ok;
    if (!handoff.ok) notes.push(`handoff_http_${handoff.status}`);
  } catch {
    notes.push("handoff_fetch_failed");
  }

  if (!walletOperational) {
    notes.push("full_journey_requires_wallet_operational_host");
  }

  return {
    host: base,
    http_status_home: httpStatusHome,
    commit_sha: commitSha,
    staging_identity_ok: stagingIdentityOk,
    wallet_operational: walletOperational,
    wallet_enabled: walletEnabled,
    matches_expected_main_sha: commitSha ? commitSha.startsWith(expectedMainSha.slice(0, 12)) : null,
    unified_handoff_reachable: unifiedHandoffReachable,
    notes,
  };
}

async function main() {
  if (hosts.length === 0) {
    console.error("Set LAUNCHPAD_STAGING_URL and/or DEMO_PUBLIC_URL");
    process.exit(2);
  }
  mkdirSync(artifactDir, { recursive: true });
  const probes = await Promise.all(hosts.map((h) => probeHost(h)));
  const payload = {
    build: 878,
    expected_main_sha: expectedMainSha,
    probed_at: new Date().toISOString(),
    hosts: probes,
  };
  const out = resolve(artifactDir, "deployed-environment-probe.json");
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, artifact: out, hosts: probes.map((p) => p.host) }, null, 2));
}

void main();
