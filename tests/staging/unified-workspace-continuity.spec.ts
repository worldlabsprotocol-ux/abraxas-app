import { test, expect } from "@playwright/test";

/**
 * Build 877 — guided integration stays on Developer Workspace (no Integration Studio route hop).
 */
test.describe("Unified workspace continuity", () => {
  test("handoff URL loads sandbox create on ephemeral-sandbox", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) {
      test.skip(true, "BLOCKED: set PLAYWRIGHT baseURL");
      return;
    }

    const handoff = `${base}/developers/ephemeral-sandbox?integration=1&source=developer-workspace&pack=wallet_control&path=verify_with_abraxas&step=create_sandbox#sandbox`;
    await page.goto(handoff, { waitUntil: "domcontentloaded" });

    expect(page.url()).toContain("/developers/ephemeral-sandbox");
    expect(page.url()).not.toContain("/developers/integration-studio");
    await expect(page.getByRole("heading", { name: /Your Abraxas workspace/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Create my test app$/i })).toBeVisible({
      timeout: 60_000,
    });

    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/unified-workspace-sandbox-step-desktop.png",
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
