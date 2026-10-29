import { test, expect } from "@playwright/test";

/**
 * Build 905 — active builder task stays in viewport; beginner auth uses wallet copy.
 */
test.describe("Build 905 homepage builder focus", () => {
  test("integration handoff keeps inline workspace marker on homepage", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.route("**/api/auth/native/enabled", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          enabled: true,
          operational: true,
          auth_mode: "ephemeral_wallet",
        }),
      });
    });
    await page.route("**/api/auth/wallet/enabled", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ operational: true }),
      });
    });
    await page.route("**/api/auth/wallet/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          wallet_address: "DemoWallet1111111111111111111111111111111111",
          session_id: "preview-session",
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
        }),
      });
    });
    await page.route("**/api/account/overview", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          native_account: { authenticated: false, account_id: null, partner_membership_count: 0 },
          wallet_auth: {
            authenticated: true,
            wallet_address: "DemoWallet1111111111111111111111111111111111",
            auth_mode: "ephemeral_wallet",
          },
          partner_console: { authenticated: false, partner_id: null, environment: null },
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.setItem(
        "abx_home_builder_discovery_v1",
        JSON.stringify({
          platform: "website",
          policyPackId: "wallet_control",
          updatedAt: new Date().toISOString(),
        }),
      );
      sessionStorage.setItem("abx_homepage_create_app_unlocked_v1", "1");
    });

    await page.goto(
      `${base}/?integration=1&source=developer-workspace&step=create_sandbox&pack=wallet_control&path=hosted_partner_flow#start-sandbox`,
      { waitUntil: "domcontentloaded" },
    );

    await expect(page).toHaveURL(/integration=1/);
    expect(page.url()).not.toContain("/developers/ephemeral-sandbox");

    const workspace = page.locator("[data-homepage-workspace]");
    await expect(workspace).toBeVisible({ timeout: 20_000 });

    const task = page.locator("[data-homepage-active-task]").first();
    await expect(task).toBeVisible({ timeout: 20_000 });
    await expect(task).toBeInViewport();

    await expect(page.getByRole("heading", { name: "Create your test app" })).toBeVisible();
    await expect(page.getByText("Launchpad session")).toHaveCount(0);
    const walletGate = page.getByText("Connect your wallet to continue.");
    const createPanel = page.getByText("Start with a free test");
    await expect(walletGate.or(createPanel)).toBeVisible();
    await page.screenshot({
      path: "/opt/cursor/artifacts/build-905-homepage-integration-handoff.png",
      fullPage: false,
    });
  });

  test("Start building hash focuses start-sandbox workspace root", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.locator('a[href="#start-sandbox"]').first().click();
    await expect(page).toHaveURL(/#start-sandbox/);

    const section = page.locator("#start-sandbox.abx-native-sandbox-chapter");
    await expect(section).toBeInViewport();
  });
});
