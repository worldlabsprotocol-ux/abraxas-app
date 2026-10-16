#!/usr/bin/env npx tsx
// FILE: scripts/build-584/run-authenticated-browser-acceptance.ts

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";

async function main() {
  const base = (process.env.BUILD584_BROWSER_BASE_URL ?? process.env.BUILD584_SANDBOX_BASE_URL ?? "https://abraxasworld.xyz")
    .replace(/\/$/, "");
  const apiKey = process.env.BUILD584_PARTNER_API_KEY?.trim();
  const outDir = process.env.BUILD584_BROWSER_ARTIFACT_DIR?.trim() || join(process.cwd(), "artifacts");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, "build584-browser"), { recursive: true });

  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const recordedAt = new Date().toISOString();
  const evidenceSources: string[] = [];
  const routesTested: string[] = [];
  const outcomes: Array<{ step: string; status: string; detail: string }> = [];

  if (!apiKey) {
    const artifact = {
      ok: false,
      build: 584,
      build_identity: agentGitSha,
      environment: base,
      recorded_at: recordedAt,
      partner_session: "blocked",
      routes_tested: routesTested,
      evidence_sources: evidenceSources,
      outcomes: [{
        step: "partner_sign_in",
        status: "blocked",
        detail: "Set BUILD584_PARTNER_API_KEY (sandbox abx_test_…) in the operator environment. Key is never written to this artifact.",
      }],
    };
    writeArtifact(outDir, artifact);
    console.log(JSON.stringify(artifact, null, 2));
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const launchpadPath = INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF;
    await page.goto(`${base}${launchpadPath}`, { waitUntil: "networkidle", timeout: 120_000 });
    routesTested.push(launchpadPath);
    const desktopLaunch = join(outDir, "build584-browser/launchpad-desktop.png");
    await page.screenshot({ path: desktopLaunch, fullPage: true });
    evidenceSources.push(desktopLaunch);

    await page.getByLabel("Sandbox API key").fill(apiKey);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForTimeout(2500);

    const signedInShot = join(outDir, "build584-browser/launchpad-after-signin-desktop.png");
    await page.screenshot({ path: signedInShot, fullPage: true });
    evidenceSources.push(signedInShot);

    const alert = page.locator('[role="alert"]');
    const alertVisible = await alert.isVisible().catch(() => false);
    outcomes.push({
      step: "partner_sign_in",
      status: alertVisible ? "fail" : "pass",
      detail: alertVisible ? "Launchpad reported an error after sandbox key sign-in." : "No error alert after sign-in.",
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}${launchpadPath}`, { waitUntil: "networkidle", timeout: 120_000 });
    const mobileShot = join(outDir, "build584-browser/launchpad-mobile-390.png");
    await page.screenshot({ path: mobileShot, fullPage: true });
    evidenceSources.push(mobileShot);
    routesTested.push(`${launchpadPath}@390px`);

    const studioPath =
      "/developers/integration-studio?pack=sandbox_institutional_protocol_access&path=institutional_eligibility_gate&action=org_protocol_access&category=institutional_eligibility&environment=sandbox";
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}${studioPath}`, { waitUntil: "networkidle", timeout: 120_000 });
    routesTested.push(studioPath);
    const studioShot = join(outDir, "build584-browser/integration-studio-desktop.png");
    await page.screenshot({ path: studioShot, fullPage: true });
    evidenceSources.push(studioShot);
  } finally {
    await browser.close();
  }

  const ok = outcomes.every((o) => o.status === "pass");
  const artifact = {
    ok,
    build: 584,
    build_identity: agentGitSha,
    environment: base,
    recorded_at: recordedAt,
    partner_session: ok ? "sandbox_api_key" : "failed",
    routes_tested: routesTested,
    evidence_sources: evidenceSources,
    outcomes,
  };
  writeArtifact(outDir, artifact);
  console.log(JSON.stringify(artifact, null, 2));
  process.exit(ok ? 0 : 1);
}

function writeArtifact(outDir: string, artifact: Record<string, unknown>) {
  const path = join(outDir, "build584-authenticated-browser-acceptance.json");
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  const mirror = "/opt/cursor/artifacts/build584-authenticated-browser-acceptance.json";
  try {
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    writeFileSync(mirror, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  } catch {
    // optional mirror
  }
  console.error(`Wrote ${path}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
