import { test, expect } from "@playwright/test";

/**
 * Build 905 — active builder task stays in viewport; beginner auth uses wallet copy.
 */
test.describe("Build 905 homepage builder focus", () => {
  test("integration handoff keeps inline workspace marker on homepage", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

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
    await expect(page.getByText("Connect your wallet to continue.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with wallet" })).toBeVisible();
    await expect(page.getByText("Launchpad session")).toHaveCount(0);
  });

  test("Start building hash focuses start-sandbox workspace root", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.locator('a[href="#start-sandbox"]').first().click();
    await expect(page).toHaveURL(/#start-sandbox/);

    const section = page.locator("#start-sandbox");
    await expect(section).toBeInViewport();
  });
});
