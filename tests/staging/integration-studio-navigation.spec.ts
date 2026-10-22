import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL ?? process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";

test.describe("Integration Studio stage navigation", () => {
  test("direct hash load, refresh, footer, and history", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${base}/developers/integration-studio#configuration`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/#configuration$/);
    await expect(page.getByRole("heading", { name: /Configuration unlocks|Sandbox configuration/i })).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/#configuration$/);

    await page.getByRole("link", { name: /Back: Sandbox/i }).click();
    await expect(page).toHaveURL(/#sandbox$/);
    await expect(page.getByRole("heading", { name: /Create.*sandbox integration/i })).toBeVisible();

    await page.getByRole("link", { name: /Step 3:.*Configuration/i }).click();
    await expect(page).toHaveURL(/#configuration$/);

    await page.goBack();
    await expect(page).toHaveURL(/#sandbox$/);

    await page.getByRole("link", { name: /Step 1:.*Policy/i }).click();
    await expect(page.getByRole("heading", { name: /Choose a policy pack/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Create.*sandbox integration/i })).toHaveCount(0);
  });

  test("mobile stage tabs remain usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /Step 4:.*Request/i }).click();
    await expect(page).toHaveURL(/#request$/);
    await expect(page.getByRole("heading", { name: /Verification requests require|Authenticated request builder/i })).toBeVisible();
  });
});
