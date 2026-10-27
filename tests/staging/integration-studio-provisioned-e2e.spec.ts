import { test, expect } from "@playwright/test";

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
    const callbackUrl = `${base}/partner/callback`;

    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /^Choose a policy pack$/i })).toBeVisible();

    await page.getByRole("button", { name: /Wallet control eligibility/i }).click();

    await page.getByRole("link", { name: /Step 2:.*Sandbox/i }).click();
    await expect(page).toHaveURL(/#sandbox$/);

    await page.getByLabel(/Sandbox application name/i).fill(appName);
    await page.getByLabel(/Development callback/i).fill(callbackUrl);
    await page.getByRole("button", { name: /^Create sandbox$/i }).click();

    await expect(page.getByText(/Session active/i).first()).toBeVisible({
      timeout: 90_000,
    });

    await page.getByRole("link", { name: /Step 3:.*Configuration/i }).click();
    await expect(page.getByRole("heading", { name: "Sandbox configuration" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Callback URLs|Policy/i).first()).toBeVisible();

    await page.screenshot({
      path: "/opt/cursor/artifacts/screenshots/integration-studio-provisioned-configuration-desktop.png",
      fullPage: true,
    });

    await page.getByRole("link", { name: /Step 4:.*Request/i }).click();
    const runHarness = page.getByRole("button", { name: "Run harness request" });
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
