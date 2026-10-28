// FILE: tests/staging/build-883-production-evidence.spec.ts

import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  fetchDeploymentIdentity,
  fetchWalletOperational,
  UNIFIED_HANDOFF_PATH,
} from "./unifiedWorkspaceStagingHelpers";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-883/playwright";

/**
 * Build 883 Track A — deployed shell acceptance (automated).
 * Steps 3–10 require wallet / API credentials → manual_checkpoint (see build-883 orchestrator).
 */
test.describe("Build 883 production execution evidence (automated shell)", () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test("deployment identity on target host", async ({ request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL or BUILD883_PREVIEW_URL");

    const identity = await fetchDeploymentIdentity(request, base);
    const wallet = await fetchWalletOperational(request, base);
    const home = await request.get(`${base}/`, { failOnStatusCode: false });
    const payload = {
      host: base,
      home_http_status: home.status(),
      commit_sha: identity.commit_sha,
      staging_identity_endpoint_available: identity.ok,
      wallet_operational: wallet.operational,
      manual_wallet_required: !wallet.operational,
    };
    writeFileSync(resolve(ARTIFACT_DIR, "deployment-identity.json"), `${JSON.stringify(payload, null, 2)}\n`);
    expect(home.status()).toBeLessThan(500);
  });

  test("Step 1–2 — enter test workspace handoff without Integration Studio detour", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: base URL");

    await page.goto(`${base}${UNIFIED_HANDOFF_PATH}`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/developers/ephemeral-sandbox");
    await expect(page.getByRole("status").or(page.getByRole("heading", { name: /workspace/i })).first()).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({ path: resolve(ARTIFACT_DIR, "step1-test-workspace-entry.png"), fullPage: true });
  });

  test("Step 4 — Check your proof control is present after wallet stage UI loads", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: base URL");

    await page.goto(`${base}${UNIFIED_HANDOFF_PATH}`, { waitUntil: "domcontentloaded" });
    const proofButton = page.getByRole("button", { name: /Check your proof/i });
    const proofLink = page.getByRole("link", { name: /Check your proof/i });
    const count = (await proofButton.count()) + (await proofLink.count());
    if (count === 0) {
      test.skip(true, "MANUAL: wallet stage not reached — connect wallet to expose Check your proof");
    }
    await expect(proofButton.or(proofLink).first()).toBeVisible();
    await page.screenshot({ path: resolve(ARTIFACT_DIR, "step4-check-your-proof-control.png"), fullPage: true });
  });

  test("Recovery — refresh preserves workspace route", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: base URL");

    await page.goto(`${base}${UNIFIED_HANDOFF_PATH}`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/developers/ephemeral-sandbox");
  });
});
