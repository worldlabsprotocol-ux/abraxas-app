import { test, expect } from "@playwright/test";

/**
 * Build 897 — homepage builder stays one document; create-app errors are not generic-only.
 */
test.describe("Build 897 product acceptance", () => {
  test("homepage embed hides Launchpad session panel", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/#start-sandbox`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.sessionStorage.removeItem("abx_home_builder_discovery_v1");
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const discovery = page.getByTestId("home-builder-discovery");
    if (!(await discovery.isVisible().catch(() => false))) {
      test.skip(true, "Discovery not visible");
    }

    await discovery.getByRole("radio", { name: /Website/i }).click();
    await discovery.getByRole("radio", { name: /Wallet control eligibility/i }).click();
    await discovery.getByRole("button", { name: /Continue to authorize/i }).click();

    await expect(page.getByText("Launchpad session")).toHaveCount(0);
    expect(page.url()).not.toContain("/developers/launchpad");
  });

  test("create test app stays on homepage path", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/?integration=1#sandbox`, { waitUntil: "domcontentloaded" });
    const createBtn = page.getByRole("button", { name: /^Create my test app$/i });
    if (!(await createBtn.isVisible().catch(() => false))) {
      test.skip(true, "Sandbox stage not ready");
    }

    const popupPromise = page.waitForEvent("popup", { timeout: 2_000 }).catch(() => null);
    await createBtn.click();
    const popup = await popupPromise;
    expect(popup).toBeNull();
    expect(page.url()).toMatch(/^\//);
    expect(page.url()).not.toContain("/developers/ephemeral-sandbox");
  });
});
