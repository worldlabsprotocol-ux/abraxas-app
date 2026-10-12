import { test, expect } from "@playwright/test";

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
] as const;

test.describe("Homepage V2 layout smoke", () => {
  for (const vp of viewports) {
    test(`homepage renders without horizontal overflow (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1.abx-premium-hero__title")).toContainText("Prove what matters");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(overflow).toBe(false);
    });
  }

  test("simulated receipt revocation toggles DENY", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      document.getElementById("chapter-evidence")?.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /Simulate revocation/i }).waitFor({ state: "visible", timeout: 60_000 });
    const outcome = page.locator(".abx-receipt-inspector__outcome");
    await expect(outcome).toContainText("PERMIT");
    await page.getByRole("button", { name: /Simulate revocation/i }).click();
    await expect(outcome).toContainText("DENY");
  });
});
