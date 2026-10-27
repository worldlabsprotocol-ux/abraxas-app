import { test, expect } from "@playwright/test";

/**
 * Session continuity, failure, refresh, and tenant isolation on Launchpad-backed deployments.
 */
test.describe("Integration Studio session resilience", () => {
  test("invalid attach key stays unsigned in", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/developers/integration-studio#sandbox`, { waitUntil: "networkidle" });
    await page.getByLabel(/Resume with sandbox API key/i).fill("abx_test_notavalidsecret000000000000");
    await page.getByRole("button", { name: "Attach session" }).click();
    await expect(page.getByText(/Invalid API key|Could not attach/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Session active/i)).toHaveCount(0);
    expect(page.url()).not.toMatch(/abx_test_/);
  });

  test("provisioned session survives refresh and stage navigation", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: LAUNCHPAD_STAGING_URL");

    const appName = `studio-refresh-${Date.now()}`;
    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Wallet control eligibility/i }).click();
    await page.getByRole("link", { name: /Step 2:.*Sandbox/i }).click();
    await page.getByLabel(/Sandbox application name/i).fill(appName);
    await page.getByLabel(/Development callback/i).fill(`${base}/partner/callback`);
    await page.getByRole("button", { name: /^Create sandbox$/i }).click();
    await expect(page.getByText(/Session active/i).first()).toBeVisible({ timeout: 90_000 });

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText(/Session active/i).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("link", { name: /Step 4:.*Request/i }).click();
    await expect(page.getByRole("button", { name: "Run harness request" })).toBeEnabled({ timeout: 45_000 });
  });

  test("cross-tenant application API rejects foreign session", async ({ page, request, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    const foreignApp = process.env.REUSE_APPLICATION_ID?.trim();
    if (!base || !foreignApp) test.skip(true, "BLOCKED: LAUNCHPAD_STAGING_URL and REUSE_APPLICATION_ID");

    const appName = `studio-tenant-${Date.now()}`;
    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Wallet control eligibility/i }).click();
    await page.getByRole("link", { name: /Step 2:.*Sandbox/i }).click();
    await page.getByLabel(/Sandbox application name/i).fill(appName);
    await page.getByLabel(/Development callback/i).fill(`${base}/partner/callback`);
    await page.getByRole("button", { name: /^Create sandbox$/i }).click();
    await expect(page.getByText(/Session active/i).first()).toBeVisible({ timeout: 90_000 });

    const foreignRes = await request.get(`${base}/api/launchpad/applications/${foreignApp}`, {
      failOnStatusCode: false,
    });
    expect([401, 403, 404]).toContain(foreignRes.status());
    const body = await foreignRes.text();
    expect(body).not.toMatch(/abx_test_|abx_live_/);
  });
});
