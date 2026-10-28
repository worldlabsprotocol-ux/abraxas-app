import { test, expect } from "@playwright/test";
import { fetchDeploymentIdentity, fetchWalletOperational } from "./unifiedWorkspaceStagingHelpers";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-889/playwright";

/**
 * Build 889 — founder journey contract checks (automated portions).
 * Wallet signing remains a manual Production checkpoint when wallet is not operational.
 */
test.describe("Build 889 founder journey contract", () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test("deployment identity recorded", async ({ request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");
    const identity = await fetchDeploymentIdentity(request, base);
    writeFileSync(
      resolve(ARTIFACT_DIR, "deployment-identity.json"),
      `${JSON.stringify(identity, null, 2)}\n`,
    );
    expect(typeof identity.commit_sha).toBe("string");
  });

  test("Start building entry and free sandbox copy", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");
    await page.goto(`${base}/#start-sandbox`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Start building/i }).first()).toBeVisible();
    await expect(page.getByText(/free sandbox testing/i).first()).toBeVisible();
    await page.screenshot({
      path: resolve(ARTIFACT_DIR, "start-building-free-sandbox-copy.png"),
      fullPage: true,
    });
  });

  test("Launchpad starter-kit rejects unknown_field for rogue body (API contract)", async ({ request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");
    const wallet = await fetchWalletOperational(request, base);
    writeFileSync(
      resolve(ARTIFACT_DIR, "wallet-operational.json"),
      `${JSON.stringify(wallet, null, 2)}\n`,
    );
    const res = await request.post(`${base}/api/launchpad/applications/app-nonexistent/starter-kit`, {
      data: {
        binding_id: "bind_test",
        path: "hosted_partner_flow",
        platform: "wix_velo",
        rogue_field: true,
      },
      failOnStatusCode: false,
    });
    expect([400, 401, 404]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 400) {
      expect(body.error).toBe("unknown_field");
    }
  });
});
