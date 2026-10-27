import { test, expect } from "@playwright/test";
import { fetchWalletOperational, UNIFIED_HANDOFF_PATH } from "./unifiedWorkspaceStagingHelpers";

/**
 * Build 877/878 — guided integration stays on Developer Workspace (no Integration Studio route hop).
 */
test.describe("Unified workspace continuity", () => {
  test("handoff URL loads sandbox create on ephemeral-sandbox", async ({ page, request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) {
      test.skip(true, "BLOCKED: set PLAYWRIGHT baseURL");
      return;
    }

    const wallet = await fetchWalletOperational(request, base);
    if (!wallet.operational) {
      test.skip(true, "MANUAL CHECKPOINT: wallet sandbox not operational on this host");
    }

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
      path: "/opt/cursor/artifacts/screenshots/unified-workspace-sandbox-step-desktop.png",
      fullPage: true,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/developers/ephemeral-sandbox");
    expect(page.url()).not.toContain("/developers/integration-studio");
    await expect(page.getByRole("button", { name: /^Create my test app$/i })).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/unified-workspace-sandbox-step-after-refresh-desktop.png",
      fullPage: true,
    });
  });

  test("handoff URL mobile viewport keeps single workspace chrome", async ({ page, request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) {
      test.skip(true, "BLOCKED: set PLAYWRIGHT baseURL");
      return;
    }
    const wallet = await fetchWalletOperational(request, base);
    if (!wallet.operational) {
      test.skip(true, "MANUAL CHECKPOINT: wallet sandbox not operational on this host");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}${UNIFIED_HANDOFF_PATH}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("status").filter({ hasText: /Your Abraxas workspace/i })).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/unified-workspace-sandbox-step-mobile.png",
      fullPage: true,
    });
  });

  test("Integration Studio deep link still works", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) {
      test.skip(true, "BLOCKED: set PLAYWRIGHT baseURL");
      return;
    }
    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Your first integration/i })).toBeVisible();
    expect(page.url()).toContain("/developers/integration-studio");
  });
});
