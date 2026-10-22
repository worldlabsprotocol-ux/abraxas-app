import { test, expect } from "@playwright/test";
import path from "node:path";

const outDir = process.env.HOLDER_UI_SCREENSHOT_DIR ?? "/opt/cursor/artifacts";

test.describe("holder wallet-control focused UI", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    test.skip(!baseURL, "PLAYWRIGHT_BASE_URL required");
    await page.route("**/api/v1/hosted-handoff/continue-context**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          partner_id: "studio-accept-wc-demo",
          partner_name: "Your application",
          policy_id: "studio-accept-wc-demo-wallet_control-v1",
          purpose: "Confirm wallet control",
          return_url: "https://example.com/callback",
        }),
      });
    });
    await page.route("**/api/v1/partner-verify/method-qualification**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, method_qualified: false, issuedReceipt: false }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, method_qualified: true }),
      });
    });
  });

  test("review and verify-wallet stages (desktop + mobile screenshots)", async ({ page }) => {
    const verifyRequest = "vr_holder_ui_acceptance_demo";
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/partner/continue?verify_request=${encodeURIComponent(verifyRequest)}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByText("Abraxas Verification")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Confirm wallet control" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Verification progress" })).toBeVisible();
    await expect(page.getByText("Authorization")).toHaveCount(0);

    await page.screenshot({
      path: path.join(outDir, "holder-wallet-control-review-desktop.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Continue to verify wallet" }).click();
    await expect(page.getByRole("heading", { name: "Verify wallet" })).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, "holder-wallet-control-verify-desktop.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/partner/continue?verify_request=${encodeURIComponent(verifyRequest)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: "Confirm wallet control" })).toBeVisible({
      timeout: 60_000,
    });
    await page.screenshot({
      path: path.join(outDir, "holder-wallet-control-review-mobile.png"),
      fullPage: true,
    });
  });
});
