import { test, expect } from "@playwright/test";

const DEPLOY_BASE = process.env.PLAYWRIGHT_DEPLOY_URL?.replace(/\/$/, "");

test.describe("Deployed Demo acceptance (requires PLAYWRIGHT_DEPLOY_URL)", () => {
  test.skip(!DEPLOY_BASE, "Set PLAYWRIGHT_DEPLOY_URL to a Vercel preview or Demo URL");

  test("homepage Explore the demo → tour", async ({ page }) => {
    await page.goto(`${DEPLOY_BASE}/`);
    await page.getByRole("link", { name: "Explore the demo" }).click();
    await expect(page).toHaveURL(/\/experience\/tour/);
    await expect(page.getByText(/Simulated demonstration/i)).toBeVisible();
  });
});
