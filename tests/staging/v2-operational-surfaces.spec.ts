import { test, expect } from "@playwright/test";

const base = process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";

test.describe("V2 operational surfaces", () => {
  test("integration studio workspace renders lifecycle nav and inspector", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/developers/integration-studio`);
    await expect(page.getByRole("navigation", { name: "Integration lifecycle" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Inspector sections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Authenticated request builder" })).toBeVisible();
  });

  test("passport shows assurance boundary notice", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/passport`);
    await expect(page.getByRole("region", { name: "Identity versus partner authorization" })).toBeVisible();
  });

  test("launchpad operational layout at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/developers/launchpad`);
    await expect(page.getByRole("heading", { name: "Integrate private eligibility" })).toBeVisible();
    await expect(page.locator(".abx-launchpad-operational")).toBeVisible();
  });

  test("governance console read-only banner", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/admin/governance`);
    await expect(page.getByRole("heading", { name: "Trust registry custody" })).toBeVisible();
    await expect(page.getByText("read-only", { exact: false })).toBeVisible();
  });
});
