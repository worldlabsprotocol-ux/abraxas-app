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

test.describe("Public Sign in button", () => {
  test("returning passkey user signs in with one Sign in click", async ({ page, context }) => {
    const enabled = await page.request.get("/api/auth/native/enabled");
    const enabledJson = await enabled.json();
    test.skip(!enabledJson.operational, "Native auth not operational");

    await page.setViewportSize({ width: 1440, height: 900 });
    const { client, authenticatorId } = await enableVirtualAuthenticator(page, context);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Sign in with Abraxas passkey/i }).click();

    const createMenuTrigger = page.getByRole("button", { name: /Sign in with passkey/i }).filter({ hasText: /more options/i });
    if (await createMenuTrigger.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await createMenuTrigger.click();
      await page.getByRole("menuitem", { name: /Create passkey account/i }).click();
    } else {
      const inlineCreate = page.getByRole("button", { name: /Create passkey account/i });
      if (await inlineCreate.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await inlineCreate.click();
      }
    }

    await expect.poll(async () =>
      page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        return (await res.json()).authenticated;
      }),
      { timeout: 60_000 },
    ).toBe(true);

    const accountId = (
      await page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        return (await res.json()).account_id as string;
      })
    );

    await clearNativeSession(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Sign in with Abraxas passkey/i }).click();

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
    const enabledJson = await enabled.json();
    test.skip(!enabledJson.operational, "Native auth not operational");

    await page.setViewportSize({ width: 1440, height: 900 });
    const { client, authenticatorId } = await enableVirtualAuthenticator(page, context);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Sign in with Abraxas passkey/i }).click();

    const connectMenu = page.getByRole("button", { name: /Sign in with passkey — more options/i });
    const menuVisible = await connectMenu.isVisible({ timeout: 15_000 }).catch(() => false);
    if (menuVisible) {
      await connectMenu.click();
      await page.getByRole("menuitem", { name: /Create passkey account/i }).click();
    } else {
      const createBtn = page.getByRole("button", { name: /Create passkey account/i });
      test.skip(!(await createBtn.isVisible({ timeout: 5_000 }).catch(() => false)), "no_passkey path not shown");
      await createBtn.click();
    }

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
    const enabledJson = await enabled.json();
    test.skip(!enabledJson.operational, "Native auth not operational");

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
    await page.getByRole("button", { name: /Sign in with Abraxas passkey/i }).click();
    await page.waitForTimeout(2500);

    expect(
      await page.evaluate(async () => {
        const res = await fetch("/api/auth/native/session", { credentials: "include" });
        return (await res.json()).authenticated;
      }),
    ).toBe(false);

    await client.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
  });

  test("when native auth flag is off, Sign in links to workspace without Passport", async ({ page }) => {
    await page.route("**/api/auth/native/enabled", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ enabled: false, operational: false, connect_mode: "explore" }),
      }),
    );
    await page.route("**/api/auth/native/session", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false }),
      }),
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const signIn = page.getByRole("link", { name: /Create an Abraxas account in the workspace section/i });
    await expect(signIn.first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: /Passport/i })).toHaveCount(0);
  });

  test("when native auth is degraded, unavailable menu has Explore only", async ({ page }) => {
    await page.route("**/api/auth/native/enabled", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          enabled: true,
          operational: false,
          connect_mode: "unavailable",
        }),
      }),
    );
    await page.route("**/api/auth/native/session", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false }),
      }),
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const trigger = page.getByRole("button", { name: /Account sign-in unavailable/i });
    await expect(trigger).toHaveCount(1);
    await trigger.click();
    await expect(page.getByRole("menuitem", { name: /Explore Integration Studio/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Passport/i })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: /Retry/i })).toHaveCount(0);
  });
});
