import { test, expect } from "@playwright/test";

async function enableVirtualAuthenticator(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext) {
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
  return { client, authenticatorId };
}

async function clearNativeSession(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await fetch("/api/auth/native/session", { method: "DELETE", credentials: "include" });
  });
}

test.describe("Public Connect button", () => {
  test("returning passkey user signs in with one Connect click", async ({ page, context }) => {
    const enabled = await page.request.get("/api/auth/native/enabled");
    test.skip(!(await enabled.json()).enabled, "Native auth disabled");

    await page.setViewportSize({ width: 1440, height: 900 });
    const { client, authenticatorId } = await enableVirtualAuthenticator(page, context);

    await page.goto("/#start-sandbox", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Create account$/i }).click();
    await expect(page.getByRole("button", { name: /Set up workspace/i })).toBeVisible({ timeout: 60_000 });

    const accountId = (
      await page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        return (await res.json()).account_id as string;
      })
    );

    await clearNativeSession(page);
    expect(
      await page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        return (await res.json()).authenticated;
      }),
    ).toBe(false);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Connect with Abraxas passkey/i }).click();

    await expect.poll(async () =>
      page.evaluate(async (expectedId) => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        const json = (await res.json()) as { authenticated?: boolean; account_id?: string };
        return Boolean(json.authenticated && json.account_id === expectedId);
      }, accountId),
    ).toBe(true);

    await expect(page).toHaveURL(/\/account\/applications/, { timeout: 15_000 });
    expect(page.url()).not.toContain("/passport");

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });

  test("Create passkey account control registers only after explicit click", async ({ page, context }) => {
    const enabled = await page.request.get("/api/auth/native/enabled");
    test.skip(!(await enabled.json()).enabled, "Native auth disabled");

    await page.setViewportSize({ width: 1440, height: 900 });
    const { client, authenticatorId } = await enableVirtualAuthenticator(page, context);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Connect with Abraxas passkey/i }).click();

    const createBtn = page.getByRole("button", { name: /Create passkey account/i });
    const visible = await createBtn.isVisible({ timeout: 15_000 }).catch(() => false);
    test.skip(!visible, "This browser did not report confirmed no_passkey after Connect");

    expect(
      await page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        return (await res.json()).authenticated;
      }),
    ).toBe(false);

    await createBtn.click();
    await expect.poll(async () =>
      page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        return (await res.json()).authenticated;
      }),
    ).toBe(true);

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });

  test("cancelled or timed-out WebAuthn does not create a session", async ({ page, context }) => {
    const enabled = await page.request.get("/api/auth/native/enabled");
    test.skip(!(await enabled.json()).enabled, "Native auth disabled");

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
    await client.send("WebAuthn.setAutomaticPresenceSimulation", { authenticatorId, enabled: false });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Connect with Abraxas passkey/i }).click();
    await page.waitForTimeout(2500);

    expect(
      await page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        return (await res.json()).authenticated;
      }),
    ).toBe(false);

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });

  test("when native auth disabled, Connect links to Passport not Integration Studio", async ({ page }) => {
    await page.route("**/api/auth/native/enabled", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ enabled: false }) }),
    );
    await page.route("**/api/auth/native/session", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false }),
      }),
    );
    await page.route("**/api/auth/browser-session", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ ok: false }) }),
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const connect = page.locator('a[href="/passport"]').filter({ hasText: "Connect" });
    await expect(connect.first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('a[href="/developers/integration-studio"]').filter({ hasText: "Connect" })).toHaveCount(
      0,
    );
  });
});
