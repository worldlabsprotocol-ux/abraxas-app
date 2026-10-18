import { test, expect } from "@playwright/test";
import path from "node:path";

const VIEWPORTS = [
  { name: "1440-desktop", width: 1440, height: 900 },
  { name: "390-mobile", width: 390, height: 844 },
] as const;

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-740-viewports";

async function mockDegradedNative(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/native/enabled", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        operational: false,
        connect_mode: "unavailable",
      }),
    }),
  );
  await page.route("**/api/auth/native/session", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: false }) }),
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

test.describe("Public nav layout", () => {
  for (const vp of VIEWPORTS) {
    test(`wallet, sign-in, launch distinct @ ${vp.name}`, async ({ page }) => {
      await mockDegradedNative(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });

      await expect(page.getByRole("button", { name: /Connect a supported Sui wallet/i })).toHaveCount(1);
      await expect(page.getByRole("button", { name: /Account sign-in unavailable/i })).toHaveCount(1);
      await expect(page.getByRole("link", { name: /Launch App/i }).first()).toBeVisible();
      await expect(page.getByText(/Passport \(legacy\)/i)).toHaveCount(0);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `nav-${vp.name}.png`),
        fullPage: false,
      });
    });
  }

  test("workspace unavailable has one primary explore action", async ({ page }) => {
    await mockDegradedNative(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#start-sandbox", { waitUntil: "networkidle" });

    await expect(page.locator(".abx-sandbox-entry__actions a.abx-premium-hero__cta--primary")).toHaveCount(1);
    await expect(page.getByText(/Passport/i)).toHaveCount(0);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "workspace-unavailable-1440.png"),
      fullPage: false,
    });
  });
});
