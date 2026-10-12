import { test, expect } from "@playwright/test";

const base = process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";

test.describe("V2 operational accessibility", () => {
  test("integration studio lifecycle nav is keyboard reachable", async ({ page }) => {
    await page.goto(`${base}/developers/integration-studio`);
    await page.keyboard.press("Tab");
    const nav = page.getByRole("navigation", { name: "Integration lifecycle" });
    await expect(nav).toBeVisible();
    const firstLink = nav.getByRole("link").first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
  });

  test("passport holder workspace section nav exists", async ({ page }) => {
    await page.goto(`${base}/passport`);
    await expect(page.getByRole("navigation", { name: "Holder workspace sections" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Identity versus partner authorization" })).toBeVisible();
  });
});
