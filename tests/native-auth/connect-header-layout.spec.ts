import { test, expect } from "@playwright/test";
import path from "node:path";

const VIEWPORTS = [
  { name: "1440-desktop", width: 1440, height: 900 },
  { name: "1024-tablet", width: 1024, height: 768 },
  { name: "768-tablet", width: 768, height: 1024 },
  { name: "390-mobile", width: 390, height: 844 },
  { name: "320-narrow", width: 320, height: 568 },
] as const;

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-739-viewports";

async function mockDegradedNative(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/native/enabled", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        operational: false,
        connect_mode: "unavailable",
        degraded_reason: "migration_144_missing",
      }),
    }),
  );
  await page.route("**/api/auth/native/session", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: false }) }),
  );
  await page.route("**/api/auth/browser-session", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ ok: false }) }),
  );
  await page.route("**/api/account/overview", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        native_account: { authenticated: false, account_id: null, partner_membership_count: 0 },
        partner_console: { authenticated: false, partner_id: null, environment: null },
      }),
    }),
  );
}

test.describe("Connect header + workspace layout", () => {
  for (const vp of VIEWPORTS) {
    test(`header single Connect control @ ${vp.name}`, async ({ page }) => {
      await mockDegradedNative(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });

      const connectTriggers = page.getByRole("button", { name: /Connect|Account sign-in unavailable/i });
      await expect(connectTriggers).toHaveCount(1);

      const launchApp = page.getByRole("link", { name: /Launch App/i });
      await expect(launchApp.first()).toBeVisible();

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `header-${vp.name}-before-menu.png`),
        fullPage: false,
      });

      await connectTriggers.first().click();
      await expect(page.getByRole("menu")).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /Retry sign-in check/i })).toBeVisible();

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `header-${vp.name}-menu-open.png`),
        fullPage: false,
      });
    });
  }

  test("workspace unavailable panel has one primary studio action", async ({ page }) => {
    await mockDegradedNative(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#start-sandbox", { waitUntil: "networkidle" });

    const primaryStudio = page.locator(".abx-sandbox-entry__actions a.abx-premium-hero__cta--primary");
    await expect(primaryStudio).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Retry sign-in check/i })).toHaveCount(1);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "workspace-unavailable-1440.png"),
      fullPage: false,
    });
  });
});
