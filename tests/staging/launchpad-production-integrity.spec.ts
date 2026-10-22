import { expect, test } from "@playwright/test";

const productionBase = process.env.ABRAXAS_PRODUCTION_URL?.trim() ?? "https://abraxasworld.xyz";

test.describe("Production Launchpad integrity (#784)", () => {
  test("unified workspace markers on abraxasworld.xyz", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${productionBase}/developers/launchpad`, { waitUntil: "networkidle", timeout: 90_000 });

    await expect(page.getByRole("heading", { name: "Launchpad", level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("navigation", { name: "Launchpad integration steps" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Partner lifecycle stages" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Launchpad console", level: 1 })).toHaveCount(0);
  });

  test("mobile keeps single navigator", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${productionBase}/developers/launchpad`, { waitUntil: "networkidle", timeout: 90_000 });
    await expect(page.getByRole("navigation", { name: "Launchpad integration steps" })).toBeVisible();
  });
});
