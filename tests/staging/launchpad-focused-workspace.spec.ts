import { expect, test } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL ?? process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";

/**
 * Launchpad focused workspace — single step nav, no stacked lifecycle dashboard in canvas.
 */
test.describe("Launchpad focused workspace", () => {
  test("shows one horizontal step nav and sign-in without partner operations canvas", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/developers/launchpad`, { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Launchpad", level: 1 })).toBeVisible();

    const stepNav = page.getByRole("navigation", { name: "Launchpad integration steps" });
    await expect(stepNav).toBeVisible();
    await expect(stepNav.getByRole("button", { name: /Verify/i }).first()).toBeVisible();

    await expect(page.getByRole("tablist", { name: "Partner lifecycle stages" })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Sign in or create your first application" })).toBeVisible();

    const signInCard = page.getByRole("heading", { name: "Sign in or create your first application" });
    const stepNavBox = await stepNav.boundingBox();
    const signInBox = await signInCard.boundingBox();
    test.skip(!stepNavBox || !signInBox, "Layout boxes unavailable");
    expect(signInBox!.y).toBeLessThan(stepNavBox!.y + 420);
  });

  test("stage footer stays in workspace when journey loads", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/developers/launchpad?view=verify`, { waitUntil: "networkidle" });
    await expect(page.getByRole("navigation", { name: "Launchpad integration steps" })).toBeVisible();
    const footer = page.locator(".abx-launchpad-focused__footer");
    if (await footer.count()) {
      await expect(footer.first()).toBeVisible();
    }
  });
});
