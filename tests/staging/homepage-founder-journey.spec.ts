import { test, expect } from "@playwright/test";

/**
 * Founder journey — integration first, layout width, no route hop on create-app.
 */
test.describe("Homepage founder journey architecture", () => {
  test("integration discovery precedes wallet-only workspace chrome", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/#start-sandbox`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.sessionStorage.removeItem("abx_home_builder_discovery_v1");
      window.sessionStorage.removeItem("abx_homepage_create_app_unlocked_v1");
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const discovery = page.getByTestId("home-builder-discovery");
    await expect(discovery).toBeVisible({ timeout: 15_000 });
    await expect(discovery.getByRole("heading", { name: /What are you building/i })).toBeVisible();

    await discovery.getByRole("radio", { name: /Website/i }).click();
    await discovery.getByRole("radio", { name: /Wallet control eligibility/i }).click();
    await discovery.getByRole("button", { name: /Continue to authorize/i }).click();

    await expect(discovery).toHaveCount(0);
    expect(page.url()).not.toContain("/developers/ephemeral-sandbox");
  });

  test("policy workspace canvas uses usable width at desktop", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/#start-sandbox`, { waitUntil: "domcontentloaded" });

    const panel = page.locator(".abx-native-sandbox-chapter__panel--solo").first();
    if (!(await panel.isVisible().catch(() => false))) {
      test.skip(true, "Sandbox panel not visible without session");
    }

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThan(480);
    }

    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 1280;
    expect(docWidth).toBeLessThanOrEqual(viewportWidth + 2);
  });

  test("Create your test app does not navigate to ephemeral-sandbox route", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/#start-sandbox`, { waitUntil: "domcontentloaded" });
    const createAction = page
      .getByRole("button", { name: /^Create your test app$/i })
      .or(page.getByRole("link", { name: /^Create your test app$/i }));
    if (!(await createAction.first().isVisible().catch(() => false))) {
      test.skip(true, "Completion stage requires authenticated sandbox run");
    }

    const linkVariant = page.getByRole("link", { name: /^Create your test app$/i });
    if (await linkVariant.isVisible().catch(() => false)) {
      const href = await linkVariant.getAttribute("href");
      expect(href ?? "").not.toContain("/developers/ephemeral-sandbox");
    }

    await createAction.first().click();
    await page.waitForTimeout(800);
    expect(page.url()).not.toMatch(/\/developers\/ephemeral-sandbox/);
  });
});
