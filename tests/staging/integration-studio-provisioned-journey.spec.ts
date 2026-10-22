import { test, expect } from "@playwright/test";

/**
 * Full Integration Studio journey with an authorized staging sandbox application.
 * Credentials: LAUNCHPAD_STAGING_URL + (REUSE_SANDBOX_API_KEY or LAUNCHPAD_STUDIO_API_KEY)
 * + (REUSE_APPLICATION_ID or LAUNCHPAD_STUDIO_APPLICATION_ID)
 */
test.describe("Integration Studio provisioned journey", () => {
  test("policy through verification with real application context", async ({ page, request }) => {
    const base = process.env.LAUNCHPAD_STAGING_URL?.trim() ?? process.env.PLAYWRIGHT_BASE_URL?.trim();
    const apiKey =
      process.env.REUSE_SANDBOX_API_KEY?.trim() ?? process.env.LAUNCHPAD_STUDIO_API_KEY?.trim();
    const applicationId =
      process.env.REUSE_APPLICATION_ID?.trim() ?? process.env.LAUNCHPAD_STUDIO_APPLICATION_ID?.trim();

    if (!base || !apiKey || !applicationId) {
      test.skip(
        true,
        "BLOCKED: set LAUNCHPAD_STAGING_URL, REUSE_SANDBOX_API_KEY (or LAUNCHPAD_STUDIO_API_KEY), REUSE_APPLICATION_ID",
      );
      return;
    }

    const sessionRes = await request.post(`${base}/api/launchpad/auth/session`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(sessionRes.ok()).toBeTruthy();

    await page.context().addCookies(
      (await sessionRes.headersArray())
        .filter((header) => header.name.toLowerCase() === "set-cookie")
        .flatMap((header) => {
          const [pair] = header.value.split(";");
          const [name, ...rest] = pair.split("=");
          return [{ name, value: rest.join("="), url: base }];
        }),
    );

    await page.goto(`${base}/developers/integration-studio?app=${applicationId}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /Choose a policy pack/i })).toBeVisible();

    await page.getByRole("link", { name: /Step 3:.*Configuration/i }).click();
    await expect(page).toHaveURL(/#configuration$/);
    await expect(page.getByRole("heading", { name: "Sandbox configuration" })).toBeVisible({ timeout: 45000 });
    await expect(page.getByText(/Policy/i).first()).toBeVisible();

    await page.getByRole("link", { name: /Step 4:.*Request/i }).click();
    await expect(page.getByRole("heading", { name: "Authenticated request builder" })).toBeVisible();
    const runHarness = page.getByRole("button", { name: "Run harness request" });
    await expect(runHarness).toBeEnabled({ timeout: 30000 });
    await runHarness.click();

    await page.getByRole("tab", { name: "Response" }).click();
    const responsePre = page.locator(".abx-studio-inspector pre").first();
    await expect(responsePre).not.toBeEmpty({ timeout: 45000 });
    const responseText = await responsePre.innerText();
    expect(responseText.length).toBeGreaterThan(8);
    expect(responseText).not.toMatch(/abx_test_|abx_live_/);

    await page.getByRole("tab", { name: "Receipt" }).click();
    const receiptPre = page.locator(".abx-studio-inspector pre").first();
    await expect(receiptPre).toBeVisible();

    await page.goto(`${base}/verify?mode=receipt`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.url()).not.toContain(apiKey.slice(0, 8));
  });
});
