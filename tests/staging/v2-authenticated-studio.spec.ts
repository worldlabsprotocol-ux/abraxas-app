import { test, expect } from "@playwright/test";

/**
 * Authenticated Integration Studio harness — requires isolated sandbox credentials.
 * BLOCKED unless LAUNCHPAD_STUDIO_API_KEY and LAUNCHPAD_STUDIO_APPLICATION_ID are set.
 */
test.describe("Authenticated Integration Studio", () => {
  test("harness request records response in inspector", async ({ page, request }) => {
    const base = process.env.LAUNCHPAD_STAGING_URL?.trim();
    const apiKey = process.env.LAUNCHPAD_STUDIO_API_KEY?.trim();
    const applicationId = process.env.LAUNCHPAD_STUDIO_APPLICATION_ID?.trim();

    if (!base || !apiKey || !applicationId) {
      test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL, LAUNCHPAD_STUDIO_API_KEY, LAUNCHPAD_STUDIO_APPLICATION_ID");
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

    await page.goto(`${base}/developers/integration-studio?app=${applicationId}`);
    await page.getByRole("button", { name: "Run harness request" }).click();
    await expect(page.getByRole("tab", { name: "Response" })).toBeVisible();
    await page.getByRole("tab", { name: "Response" }).click();
    await expect(page.locator(".abx-studio-inspector pre").first()).not.toBeEmpty();
  });
});
