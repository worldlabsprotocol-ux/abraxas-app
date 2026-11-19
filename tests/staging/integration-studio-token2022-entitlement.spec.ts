import { test, expect } from "@playwright/test";

test.describe("Integration Studio Token-2022 entitlement path", () => {
  test("shows entitlement journey path on desktop", async ({ page }) => {
    await page.goto("/developers/integration-studio");
    await expect(page.getByText(/Token-2022 receipt-backed entitlement/i)).toBeVisible({ timeout: 30_000 });
  });

  test("shows entitlement journey path on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/developers/integration-studio");
    await expect(page.getByText(/Token-2022 receipt-backed entitlement/i)).toBeVisible({ timeout: 30_000 });
  });
});