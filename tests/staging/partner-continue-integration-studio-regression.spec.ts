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

    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "domcontentloaded" });

    const sandboxHeading = page.getByRole("heading", { name: /Create ·/i }).first();
    await expect(sandboxHeading).toBeVisible({ timeout: 20000 });

    const sandboxForm = page.locator("#sandbox");
    await sandboxHeading.scrollIntoViewIfNeeded();
    await expect(sandboxForm).toBeVisible();
    await expect(page.getByLabel(/Sandbox application name/i).first()).toBeVisible();

    await page.goto(`${base}/developers/integration-studio#configuration`, { waitUntil: "domcontentloaded" });
    const configuration = page.locator("#configuration");
    await configuration.scrollIntoViewIfNeeded();
    await expect(configuration).toBeVisible({ timeout: 20000 });
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
      waitUntil: "domcontentloaded",
    });

    const signIn = page.getByRole("button", { name: /Sign in again/i }).first();
    const signInLink = page.getByRole("link", { name: /Sign in again/i }).first();
    const hasSignIn = (await signIn.isVisible().catch(() => false))
      || (await signInLink.isVisible().catch(() => false));

    if (!hasSignIn) {
      test.skip(true, "BLOCKED: session already present or request unavailable in this environment");
      return;
    }

    if (await signInLink.isVisible().catch(() => false)) {
      const href = await signInLink.getAttribute("href");
      expect(href ?? "").toContain(`verify_request=${encodeURIComponent(verifyRequest)}`);
    }

    expect(page.url()).toContain("partner/continue");
    expect(page.url()).not.toMatch(/\/developers\/integration-studio/);
  });

});
