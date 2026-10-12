import { test, expect } from "@playwright/test";

test.describe("Product clarity (Build #517)", () => {
  test("Passport home explains verify-once story", async ({ page }) => {
    await page.goto("/passport");
    await expect(page.getByText(/Verify once/i).first()).toBeVisible();
    await expect(page.getByText(/Share only the answer/i).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/passport-story-strip.png", fullPage: true });
  });

  test("Integration Studio lead is operator-friendly", async ({ page }) => {
    await page.goto("/integrations");
    await expect(page.getByRole("heading", { name: /Integration Studio/i })).toBeVisible();
    await expect(page.getByText(/sandbox/i).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/integration-studio-clarity.png", fullPage: true });
  });

  test("Judge tour opens with product story", async ({ page }) => {
    await page.goto("/experience/tour");
    await expect(page.getByText(/Traditional apps ask for everything/i)).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/tour-welcome-clarity.png", fullPage: true });
  });
});
