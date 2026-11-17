import { test, expect } from "@playwright/test";
import { gotoIntegrationStudio } from "./stagingStudioNavigation";

/**
 * Provisioned Integration Studio journey via browser-first sandbox create on a Launchpad-connected deployment.
 * Does not require a pre-shared API key; creates an isolated sandbox and attaches the Launchpad session cookie.
 */
test.describe("Integration Studio browser provisioned journey", () => {
  test("policy → sandbox create → configuration → request harness", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) {
      test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL or PLAYWRIGHT baseURL");
      return;
    }

    const appName = `studio-accept-${Date.now()}`;
    await gotoIntegrationStudio(page, base, "/developers/integration-studio");
    await expect(page.getByRole("heading", { name: /^Choose a policy pack$/i })).toBeVisible();

    await page.getByRole("button", { name: /Wallet control eligibility/i }).click();
    await page.getByRole("link", { name: /Step 2:.*Sandbox/i }).click();
    await page.waitForURL(/#sandbox/, { timeout: 60_000 });
    const appNameField = page.getByLabel(/^Application name$/i);
    await expect(appNameField).toBeEnabled({ timeout: 30_000 });
    await appNameField.fill(appName);
    await page.getByRole("button", { name: /^Create my test app$/i }).click();

    await expect(
      page.getByText(
        /Sandbox ready|ready in sandbox|is ready in sandbox|Sandbox application created|Copy this key|Session active|sandbox API key|Shown once/i,
      ).first(),
    ).toBeVisible({ timeout: 120_000 });

    await expect(page).toHaveURL(/#request/, { timeout: 60_000 });
    await expect(page.url()).toMatch(/advanced=1/);
    await expect(page.getByRole("heading", { name: /^Run a test$/i })).toBeVisible({ timeout: 30_000 });
    const runHarness = page.getByRole("button", { name: /^Run test$/i });
    await expect(runHarness).toBeEnabled({ timeout: 45_000 });
    await runHarness.click();

    await page.getByRole("tab", { name: "Response" }).click();
    const pre = page.locator(".abx-studio-inspector pre").first();
    await expect(pre).not.toBeEmpty({ timeout: 45_000 });
    const text = await pre.innerText();
    expect(text).not.toMatch(/abx_test_[A-Za-z0-9]{8,}|abx_live_/);
    expect(text.length).toBeGreaterThan(8);

    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/integration-studio-provisioned-request-desktop.png",
      fullPage: true,
    });

    await page.goto(`${base}/verify?mode=receipt`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading").first()).toBeVisible();
    expect(page.url()).not.toMatch(/abx_test_|abx_live_/);
  });
});
