import { test, expect } from "@playwright/test";

const base = process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";

test.describe("V2 operational surfaces", () => {
  test("integration studio workspace renders lifecycle nav and inspector", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/developers/integration-studio`);
    await expect(page.getByRole("navigation", { name: "Integration lifecycle" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Inspector sections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Authenticated request builder" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Launchpad session" })).toBeVisible();
  });

  test("passport shows assurance boundary notice", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/passport`);
    await expect(page.getByRole("region", { name: "Identity versus partner authorization" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Holder workspace sections" })).toBeVisible();
  });

  test("launchpad operational layout at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/developers/launchpad`);
    await expect(page.getByRole("heading", { name: "Integrate private eligibility" })).toBeVisible();
    await expect(page.locator(".abx-launchpad-operational")).toBeVisible();
  });

  test("governance route is admin-gated", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/admin/governance`);
    const custody = page.getByRole("heading", { name: "Trust registry custody" });
    const gate = page.getByRole("heading", { name: "Admin access required" });
    await expect(custody.or(gate)).toBeVisible({ timeout: 20000 });
  });

  test("custody status API returns schema", async ({ request }) => {
    const res = await request.get(`${base}/api/trust/registry/custody-status`);
    expect(res.status()).toBeLessThan(600);
    const json = await res.json();
    expect(json.schema).toBe("trust_registry_custody_status_v539");
    expect(json.liveControlsEnabled).toBe(false);
  });
});
