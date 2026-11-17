import { test, expect } from "@playwright/test";
import { gotoIntegrationStudio } from "./stagingStudioNavigation";

const base =
  process.env.PLAYWRIGHT_BASE_URL ?? process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";

test.describe("Integration Studio production layout", () => {
  test("policy stage shows pack selector without overlapping partner operations", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoIntegrationStudio(page, base, "/developers/integration-studio");

    const canvas = page.locator(".abx-studio-workspace__canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas.getByRole("heading", { name: /^Choose a policy pack$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Age 21 eligibility/i })).toHaveAttribute("aria-pressed", "false");

    const inspector = page.locator(".abx-studio-workspace__inspector");
    await expect(inspector.getByRole("heading", { name: "Integration inspector" })).toBeVisible();

    const lifecycleDiagram = page.locator(".abx-partner-lifecycle-control-room");
    await expect(lifecycleDiagram).toHaveCount(0);

    await expect(inspector.getByRole("tab", { name: "Overview" })).toBeVisible();
  });

  test("stage navigation switches primary workspace content", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoIntegrationStudio(page, base, "/developers/integration-studio");

    await page.getByRole("link", { name: /Step 2:.*Sandbox/i }).click();
    await expect(page).toHaveURL(/#sandbox$/);
    await expect(page.getByRole("heading", { name: /Give your integration a name/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Choose a policy pack/i })).toHaveCount(0);

    await page.getByRole("link", { name: /Step 3:.*Configuration/i }).click();
    await expect(page).toHaveURL(/#configuration$/);
    await expect(page.getByRole("heading", { name: /Configuration unlocks|Sandbox configuration/i })).toBeVisible();
  });
});
