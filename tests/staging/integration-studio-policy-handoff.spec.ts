import { test, expect } from "@playwright/test";

const base = process.env.LAUNCHPAD_STAGING_URL?.replace(/\/$/, "") ?? process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "");

test.describe("Integration Studio policy entry", () => {
  test.beforeEach(async ({ page }) => {
    if (!base) test.skip(true, "BLOCKED: LAUNCHPAD_STAGING_URL");
    await page.addInitScript(() => {
      window.sessionStorage.removeItem("abraxas_integration_studio_draft_v1");
    });
  });

  test("fresh visitor has neutral policy selection", async ({ page }) => {
    await page.goto(`${base}/developers/integration-studio`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /Age 21 eligibility/i })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: /Wallet control eligibility/i })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("status").filter({ hasText: /Select one pack/i })).toBeVisible();
  });

  test("explicit pack handoff selects policy", async ({ page }) => {
    await page.goto(`${base}/developers/integration-studio?pack=age_21_retail`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /Age 21 eligibility/i })).toHaveAttribute("aria-pressed", "true");
  });

  test("resume application handoff infers policy pack", async ({ page }) => {
    const appId = process.env.REUSE_APPLICATION_ID?.trim();
    if (!appId || !process.env.REUSE_SANDBOX_API_KEY?.trim()) {
      test.skip(true, "BLOCKED: reuse app credentials for resume handoff");
      return;
    }
    const sessionRes = await page.request.post(`${base}/api/launchpad/auth/session`, {
      headers: { Authorization: `Bearer ${process.env.REUSE_SANDBOX_API_KEY.trim()}` },
    });
    expect(sessionRes.ok()).toBeTruthy();
    await page.goto(`${base}/developers/integration-studio?app=${appId}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /Wallet control eligibility/i })).toHaveAttribute("aria-pressed", "true");
  });
});
