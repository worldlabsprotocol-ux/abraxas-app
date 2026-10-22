import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test.describe("Integration Studio production layout", () => {
  test("policy stage shows pack selector without overlapping partner operations", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "networkidle" });

    const canvas = page.locator(".abx-studio-workspace__canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas.getByRole("heading", { name: /^Choose a policy pack$/i })).toBeVisible();

    const inspector = page.locator(".abx-studio-workspace__inspector");
    await expect(inspector.getByRole("heading", { name: "Partner operations" })).toBeVisible();

    const lifecycleDiagram = page.locator(".abx-partner-lifecycle-control-room");
    await expect(lifecycleDiagram).toHaveCount(0);

    const opsHeader = inspector.getByRole("heading", { name: "Partner operations" });
    const railRow = inspector.locator(".abx-mode-c-rail__cell").first();
    if (await railRow.count()) {
      const headerBox = await opsHeader.boundingBox();
      const rowBox = await railRow.boundingBox();
      if (headerBox && rowBox) {
        expect(rowBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 2);
      }
    }
  });

  test("stage navigation switches primary workspace content", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "networkidle" });

    await page.getByRole("link", { name: /Step 2:.*Sandbox/i }).click();
    await expect(page).toHaveURL(/#sandbox$/);
    await expect(page.getByRole("heading", { name: /Create.*sandbox integration/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Choose a policy pack/i })).toHaveCount(0);

    await page.getByRole("link", { name: /Step 3:.*Configuration/i }).click();
    await expect(page).toHaveURL(/#configuration$/);
    await expect(page.getByRole("heading", { name: /Configuration unlocks|Sandbox configuration/i })).toBeVisible();
  });
});
