import { test, expect } from "@playwright/test";

test.describe("Unified product experience (Build #518)", () => {
  test("Passport tabs use distinct holder navigation labels", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/passport");
    const tabs = page.getByLabel("Passport sections");
    await expect(tabs).toContainText("Requests");
    await expect(tabs).toContainText("Activity");
    await page.screenshot({ path: "/opt/cursor/artifacts/passport-nav-mobile-518.png", fullPage: true });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/passport");
    await expect(page.getByRole("link", { name: "Partner requests" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My confirmations" })).toBeVisible();
    await page.goto("/passport?view=requests");
    await expect(page.getByRole("heading", { name: /Share an eligibility answer/i })).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/passport-requests-desktop-518.png", fullPage: true });
  });

  test("Cielo verified-rate uses Abraxas Passport step copy", async ({ page }) => {
    await page.goto("/cielo/verified-rate");
    await expect(page.getByText(/not a hotel booking/i).first()).toBeVisible();
    await expect(page.getByText(/Your Abraxas Passport/i).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/cielo-passport-step-518.png", fullPage: true });
  });

  test("Integration Studio shows guided path", async ({ page }) => {
    await page.goto("/developers/integration-studio");
    await expect(page.getByText(/Guided path/i)).toBeVisible();
    await expect(page.getByText(/Pick an outcome/i)).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/integration-studio-guided-518.png", fullPage: true });
  });

  test("Partner Launchpad subtitle matches operator lead", async ({ page }) => {
    await page.goto("/developers/launchpad");
    await expect(page.getByText(/Choose what you need to verify/i).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/launchpad-guided-518.png", fullPage: true });
  });

  test("Homepage demo CTA unchanged", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Explore the demo/i })).toBeVisible();
  });
});
