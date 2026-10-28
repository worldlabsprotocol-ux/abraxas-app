import { test, expect } from "@playwright/test";

test.describe("Homepage header Start building regression", () => {
  test("global header exposes exactly one Start building control", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });

    const header = page.locator("nav.rd-nav-root");
    await expect(header).toBeVisible();

    const startBuilding = header.getByRole("link", { name: /^Start building$/i }).or(
      header.getByRole("button", { name: /^Start building$/i }),
    );
    await expect(startBuilding).toHaveCount(1);
  });

  test("header Start building focuses homepage builder without route change", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    const header = page.locator("nav.rd-nav-root");
    const cta = header.getByRole("link", { name: /^Start building$/i }).first();
    await cta.click();
    await expect(page).toHaveURL(/\/(#start-sandbox)?$/);
    expect(page.url()).not.toContain("/developers/ephemeral-sandbox");
    await expect(page.locator("#start-sandbox")).toBeInViewport();
  });
});
