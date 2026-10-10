import { test, expect } from "@playwright/test";

test.describe("Homepage demo entry (approved [ui-change])", () => {
  test("Explore the demo navigates to simulated tour", async ({ page }) => {
    await page.goto("/");
    const demo = page.getByRole("link", { name: "Explore the demo" });
    await expect(demo).toBeVisible();
    await demo.click();
    await expect(page).toHaveURL(/\/experience\/tour$/);
    await expect(page.getByText(/Simulated demonstration — no real credentials/i)).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/homepage-tour-after-click.png", fullPage: true });
  });

  test("demo CTA visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Explore the demo" })).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/homepage-demo-cta-mobile-390.png", fullPage: false });
  });

  test("desktop homepage hero with demo CTA", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Explore the demo" })).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/homepage-demo-cta-desktop-1440.png", fullPage: false });
  });
});
