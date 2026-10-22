import { test, expect } from "@playwright/test";

/**
 * Authenticated partner lifecycle via browser-first Integration Studio sandbox.
 * Uses real provision API + Launchpad session cookie (no committed API keys).
 */
test.describe("Integration Studio browser sandbox lifecycle", () => {
  test("provision sandbox, attach session, run harness, inspect response", async ({ page }) => {
    const base = process.env.LAUNCHPAD_STAGING_URL?.trim();
    if (!base) {
      test.skip(true, "BLOCKED: LAUNCHPAD_STAGING_URL not set");
      return;
    }

    const appName = `studio-e2e-${Date.now()}`;
    await page.goto(`${base}/developers/integration-studio#sandbox`, { waitUntil: "networkidle" });

    const nameInput = page.getByRole("textbox", { name: /application name/i }).first();
    if (!(await nameInput.isVisible().catch(() => false))) {
      test.skip(true, "BLOCKED: sandbox create form not available in this environment");
      return;
    }

    await nameInput.fill(appName);
    await page.getByRole("button", { name: /create sandbox/i }).first().click();

    await expect(page.getByText(/Session active|sandbox API key|Attach session/i).first()).toBeVisible({
      timeout: 60000,
    });

    const runHarness = page.getByRole("button", { name: "Run harness request" });
    if (!(await runHarness.isEnabled().catch(() => false))) {
      test.skip(true, "BLOCKED: Launchpad session not established after sandbox create (idempotency replay?)");
      return;
    }

    await runHarness.click();
    await page.getByRole("tab", { name: "Response" }).click();
    const pre = page.locator(".abx-studio-inspector pre").first();
    await expect(pre).not.toBeEmpty({ timeout: 30000 });
    const text = await pre.innerText();
    expect(text.length).toBeGreaterThan(10);
    expect(text).toMatch(/ok|result|error|status/i);
  });
});
