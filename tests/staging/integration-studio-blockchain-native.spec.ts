import { test, expect } from "@playwright/test";

test.describe("Integration Studio blockchain-native path", () => {
  test("shows blockchain-native path on desktop", async ({ page }) => {
    await page.goto("/developers/integration-studio");
    await expect(page.getByText(/Blockchain-native Launchpad continuity/i)).toBeVisible({ timeout: 30_000 });
  });

  test("shows blockchain-native path on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/developers/integration-studio");
    await expect(page.getByText(/Blockchain-native Launchpad continuity/i)).toBeVisible({ timeout: 30_000 });
  });
});