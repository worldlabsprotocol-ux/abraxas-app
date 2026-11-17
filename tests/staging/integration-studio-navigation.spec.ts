import { test, expect } from "@playwright/test";
import { gotoIntegrationStudio } from "./stagingStudioNavigation";

const base = process.env.PLAYWRIGHT_BASE_URL ?? process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";

test.describe("Integration Studio stage navigation", () => {
  test("direct hash load, refresh, footer, and history", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoIntegrationStudio(page, base, "/developers/integration-studio#configuration");
    await expect(page).toHaveURL(/#configuration$/);
    await expect(
      page.getByRole("heading", { name: /Configuration unlocks|Sandbox configuration|Choose a policy pack/i }),
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 60_000 });
    await expect(page).toHaveURL(/#configuration$/);

    await page.getByRole("link", { name: /Back: Sandbox/i }).click();
    await expect(page).toHaveURL(/#sandbox$/);
    await expect(page.getByRole("heading", { name: /Give your integration a name/i })).toBeVisible();

    await page.getByRole("link", { name: /Step 3:.*Configuration/i }).click();
    await expect(page).toHaveURL(/#configuration$/);

    await page.goBack();
    await expect(page).toHaveURL(/#sandbox$/);

    await gotoIntegrationStudio(page, base, "/developers/integration-studio");
    await expect(page.getByRole("button", { name: /Wallet control eligibility/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Give your integration a name/i })).toHaveCount(0);
  });

  test("mobile stage tabs remain usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoIntegrationStudio(page, base, "/developers/integration-studio");
    await page.getByRole("link", { name: /Step 4:.*Request/i }).click();
    await page.waitForURL(/#request/, { timeout: 60_000 });
    await expect(
      page.getByRole("heading", {
        name: /Run a test|Authenticated request builder|Verification requests require a sandbox application/i,
      }),
    ).toBeVisible();
  });
});
