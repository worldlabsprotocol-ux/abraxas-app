#!/usr/bin/env npx tsx
/**
 * Build #521 — deployment truth for demo.abraxasworld.xyz (read-only HTTP).
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";

const ROUTES = [
  "/",
  "/passport",
  "/cielo/verified-rate",
  "/developers/live-partner-journey",
  "/api/demo/activation-readiness",
  "/api/cielo/verified-rate/holder-brief",
];

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function extractDeploymentId(html: string): string | null {
  const m = html.match(/dpl_[A-Za-z0-9]+/);
  return m?.[0] ?? null;
}

async function probe(path: string) {
  const url = `${PUBLIC_DEMO_ORIGIN}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  const body = res.headers.get("content-type")?.includes("json")
    ? await res.text()
    : (await res.text()).slice(0, 12_000);
  const deploymentId = !path.endsWith(".json") && !res.headers.get("content-type")?.includes("json")
    ? extractDeploymentId(body)
    : null;
  return {
    path,
    status: res.status,
    deployment_id: deploymentId,
    vercel_cache: res.headers.get("x-vercel-cache"),
  };
}

async function main() {
  const localSha = gitSha();
  console.log("Build #521 deployment truth\n");
  console.log(`Local branch HEAD: ${localSha}`);
  console.log(`Demo origin: ${PUBLIC_DEMO_ORIGIN}\n`);

  const results = [];
  for (const path of ROUTES) {
    const r = await probe(path);
    results.push(r);
    console.log(`${r.status === 200 ? "OK" : "FAIL"} ${path} → ${r.status}${r.deployment_id ? ` (${r.deployment_id})` : ""}`);
  }

  const dpl = results.map(r => r.deployment_id).find(Boolean) ?? null;
  const livePartner = results.find(r => r.path === "/developers/live-partner-journey");
  const activationApi = results.find(r => r.path === "/api/demo/activation-readiness");

  console.log("\n--- Interpretation ---");
  console.log(`Vercel deployment id (from HTML): ${dpl ?? "unknown"}`);
  if (livePartner?.status === 404) {
    console.log("#520 route /developers/live-partner-journey NOT on current Demo alias (promote newer deployment).");
  }
  if (activationApi?.status === 404) {
    console.log("#521 activation API NOT on Demo yet — merge/promote stack then re-probe.");
  }
  console.log("\nAuthorized path: assign demo.abraxasworld.xyz to a Demo-environment deployment built from merged #520+#521 (Vercel → Project → Domains / Promote). Draft PR previews do NOT update the alias.");

  const out = { localSha, demoOrigin: PUBLIC_DEMO_ORIGIN, results, probedAt: new Date().toISOString() };
  writeFileSync("/opt/cursor/artifacts/build521-deployment-truth.json", JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
