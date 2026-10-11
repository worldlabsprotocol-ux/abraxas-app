import { test, expect } from "@playwright/test";

const DEMO = process.env.DEMO_PUBLIC_ORIGIN ?? "https://demo.abraxasworld.xyz";

test.describe("Demo public access (Build #520)", () => {
  test("demo passport and cielo routes respond without SSO", async ({ page }) => {
    const resPassport = await page.goto(`${DEMO}/passport`);
    expect(resPassport?.status()).toBeLessThan(400);
    await page.screenshot({ path: "/opt/cursor/artifacts/520-demo-passport-public.png", fullPage: true });

    const resCielo = await page.goto(`${DEMO}/cielo/verified-rate`);
    expect(resCielo?.status()).toBeLessThan(400);
    await expect(page.getByText(/not a hotel booking|booking/i).first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: "/opt/cursor/artifacts/520-demo-cielo-public.png", fullPage: true });
  });

  test("live partner journey doc page on local/dev", async ({ page }) => {
    await page.goto("/developers/live-partner-journey");
    await expect(page.getByRole("heading", { name: /Authentic end-to-end/i })).toBeVisible();
    await expect(page.getByText(/demo\.abraxasworld\.xyz/i)).toBeVisible();
  });
});
