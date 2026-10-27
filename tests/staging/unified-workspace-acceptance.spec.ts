import { test, expect } from "@playwright/test";
import {
  fetchDeploymentIdentity,
  fetchWalletOperational,
  UNIFIED_HANDOFF_PATH,
  VIEWPORTS,
} from "./unifiedWorkspaceStagingHelpers";
import {
  createFrictionRecord,
  finalizeFrictionRecord,
  recordRouteEvent,
} from "../../lib/developers/unifiedWorkspaceJourneyMetrics";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-878/playwright";

/**
 * Build 878 — deployed unified workspace acceptance (automated portions).
 * Wallet signing remains a manual checkpoint when `operational` is false.
 */
test.describe("Build 878 unified workspace acceptance", () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test("deployment identity and wallet gate", async ({ request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    const identity = await fetchDeploymentIdentity(request, base);
    const wallet = await fetchWalletOperational(request, base);

    const payload = {
      host: base,
      commit_sha: identity.commit_sha,
      staging_identity_ok: identity.ok,
      wallet_operational: wallet.operational,
      wallet_enabled: wallet.enabled,
      manual_wallet_checkpoint: !wallet.operational,
    };
    writeFileSync(resolve(ARTIFACT_DIR, "deployment-wallet-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);
    expect(typeof wallet.body).toBe("object");
  });

  test("Stage 1 — homepage Start building enters developer workspace", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    const friction = createFrictionRecord(base);
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    recordRouteEvent(friction, {
      pathname: "/",
      search: "",
      hash: "",
      trigger: "homepage_load",
    });

    const start = page.getByRole("link", { name: /Start building/i }).first();
    await expect(start).toBeVisible();
    await start.click();
    await page.waitForTimeout(500);
    recordRouteEvent(friction, {
      pathname: new URL(page.url()).pathname,
      search: new URL(page.url()).search,
      hash: new URL(page.url()).hash,
      trigger: "start_building_click",
    });

    expect(page.url()).toMatch(/ephemeral-sandbox|#start-sandbox/);
    await page.screenshot({
      path: resolve(ARTIFACT_DIR, "stage1-start-building.png"),
      fullPage: true,
    });
    writeFileSync(
      resolve(ARTIFACT_DIR, "stage1-friction.json"),
      `${JSON.stringify(finalizeFrictionRecord(friction), null, 2)}\n`,
    );
  });

  for (const viewport of VIEWPORTS) {
    test(`Stage 5 embed — unified handoff at ${viewport.name}px`, async ({ page, request, baseURL }) => {
      const base = baseURL?.replace(/\/$/, "");
      if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

      const wallet = await fetchWalletOperational(request, base);
      if (!wallet.operational) {
        test.skip(true, "MANUAL CHECKPOINT: wallet sandbox not operational on this host");
      }

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${base}${UNIFIED_HANDOFF_PATH}`, { waitUntil: "networkidle" });

      expect(page.url()).toContain("/developers/ephemeral-sandbox");
      expect(page.url()).not.toContain("/developers/integration-studio");

      await expect(page.getByRole("status").filter({ hasText: /Your Abraxas workspace/i })).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByRole("button", { name: /^Create my test app$/i })).toBeVisible({
        timeout: 60_000,
      });

      await page.screenshot({
        path: resolve(ARTIFACT_DIR, `stage5-embed-${viewport.name}.png`),
        fullPage: true,
      });

      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByRole("button", { name: /^Create my test app$/i })).toBeVisible({
        timeout: 60_000,
      });
      await page.screenshot({
        path: resolve(ARTIFACT_DIR, `stage5-embed-${viewport.name}-after-refresh.png`),
        fullPage: true,
      });
    });
  }

  test("Recovery — query params do not authorize partner APIs", async ({ request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    const res = await request.get(
      `${base}/api/launchpad/applications/fake-app-id?integration=1&partner_admin=1`,
      { failOnStatusCode: false },
    );
    expect([401, 403, 404]).toContain(res.status());
    const text = await res.text();
    expect(text).not.toMatch(/abx_live_/);
  });
});
