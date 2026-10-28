import { test, expect } from "@playwright/test";

/**
 * P0 — guided journey stays on homepage (no /developers/ephemeral-sandbox hop).
 */
test.describe("Homepage inline workspace continuity", () => {
  test("Start sandbox section does not auto-navigate to ephemeral-sandbox route", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/#start-sandbox`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(#start-sandbox)?$/);

    const startSection = page.locator("#start-sandbox");
    await expect(startSection).toBeVisible();

    // Allow session probe + optional wallet UI without leaving homepage.
    await page.waitForTimeout(2500);
    expect(page.url()).not.toContain("/developers/ephemeral-sandbox");
    expect(page.url()).toMatch(/abraxasworld\.xyz\/?(#[^]*)?$/);
  });
});
