import { test, expect } from "@playwright/test";

/**
 * Founder-reproduced regressions: partner sign-in return path + Integration Studio stage content.
 */
test.describe("Partner continue and Integration Studio regression", () => {
  test("Integration Studio sandbox and configuration sections are visible", async ({ page }) => {
    const base = process.env.LAUNCHPAD_STAGING_URL?.trim();
    if (!base) {
      test.skip(true, "BLOCKED: LAUNCHPAD_STAGING_URL not set");
      return;
    }

    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "networkidle" });

    await page.locator('a.abx-studio-workspace__nav-item[href$="#sandbox"]').click();
    const sandboxForm = page.locator("#sandbox");
    await expect(sandboxForm).toBeVisible({ timeout: 20000 });
    await expect(page.getByLabel(/Sandbox application name/i).first()).toBeVisible();
    await expect(sandboxForm).not.toHaveCSS("opacity", "0");

    await page.locator('a.abx-studio-workspace__nav-item[href$="#configuration"]').click();
    const configuration = page.locator("#configuration");
    await expect(configuration).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("heading", { name: /Launchpad session/i })).toBeVisible();
    await expect(configuration).not.toHaveCSS("opacity", "0");
  });

  test("partner continue exposes sign-in that preserves verify_request (no homepage detour)", async ({ page }) => {
    const base = process.env.LAUNCHPAD_STAGING_URL?.trim();
    const verifyRequest = process.env.PARTNER_CONTINUE_VERIFY_REQUEST?.trim();
    if (!base || !verifyRequest) {
      test.skip(true, "BLOCKED: LAUNCHPAD_STAGING_URL and PARTNER_CONTINUE_VERIFY_REQUEST required");
      return;
    }

    await page.context().clearCookies();
    await page.goto(`${base}/partner/continue?verify_request=${encodeURIComponent(verifyRequest)}`, {
      waitUntil: "networkidle",
    });

    const continueAction = page.getByRole("button", { name: /Connect wallet|Sign in again/i }).first();
    await expect(continueAction).toBeVisible({ timeout: 20000 });
    expect(page.url()).toContain(encodeURIComponent(verifyRequest));

    expect(page.url()).toContain("partner/continue");
    expect(page.url()).not.toMatch(/\/developers\/integration-studio/);
  });

});
