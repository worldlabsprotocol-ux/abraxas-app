import { test, expect } from "@playwright/test";

test.describe("Public Connect button", () => {
  test("starts native passkey flow without Passport or Google chooser", async ({ page, context }) => {
    const enabled = await page.request.get("/api/auth/native/enabled");
    const enabledJson = await enabled.json();
    test.skip(!enabledJson.enabled, "Native auth disabled in this environment");

    await page.setViewportSize({ width: 1440, height: 900 });
    const client = await context.newCDPSession(page);
    await client.send("WebAuthn.enable");
    const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });
    await client.send("WebAuthn.setAutomaticPresenceSimulation", { authenticatorId, enabled: true });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const connect = page.getByRole("button", { name: /Connect with Abraxas passkey/i });
    await expect(connect).toBeVisible({ timeout: 30_000 });
    await connect.click();

    await expect.poll(async () => {
      return page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        const json = (await res.json()) as { authenticated?: boolean };
        return Boolean(json.authenticated);
      });
    }).toBe(true);

    await expect(page).toHaveURL(/\/account\/applications/, { timeout: 15_000 });
    expect(page.url()).not.toContain("/passport");

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });

  test("when native auth disabled, Connect does not route to Passport", async ({ page }) => {
    await page.route("**/api/auth/native/enabled", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ enabled: false }) }),
    );
    await page.route("**/api/auth/native/session", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false }),
      }),
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const connect = page.locator('a[href="/developers/integration-studio"]').filter({ hasText: "Connect" });
    await expect(connect.first()).toBeVisible({ timeout: 30_000 });
  });
});
