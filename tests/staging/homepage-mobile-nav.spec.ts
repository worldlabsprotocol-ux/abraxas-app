import { test, expect } from "@playwright/test";
import path from "node:path";

const MOBILE_WIDTHS = [320, 375, 390] as const;
const ARTIFACT_DIR = "/opt/cursor/artifacts/homepage-mobile";

test.describe("Mobile homepage navigation and architecture", () => {
  for (const width of MOBILE_WIDTHS) {
    test(`header hierarchy and overflow (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator(".abx-premium-hero-carousel").waitFor({ state: "visible", timeout: 60_000 });

      const signIn = page.locator(".rd-nav-mobile .public-nav-connect__trigger").first();
      const startBuilding = page
        .locator(".rd-nav-mobile .rd-nav-primary-action, .rd-nav-mobile .rd-nav-start-building")
        .first();
      await expect(signIn).toBeVisible({ timeout: 30_000 });
      await expect(signIn).not.toHaveAttribute("aria-label", "Loading sign-in");
      await expect(startBuilding).toBeVisible({ timeout: 30_000 });
      await expect(startBuilding).toContainText(/Start building|Continue building/i);

      const signInBox = await signIn.boundingBox();
      const startBox = await startBuilding.boundingBox();
      expect(signInBox).toBeTruthy();
      expect(startBox).toBeTruthy();
      if (signInBox && startBox) {
        expect(startBox.width).toBeGreaterThan(signInBox.width * 0.85);
      }

      const signInBg = await signIn.evaluate((el) => getComputedStyle(el).backgroundColor);
      const startBg = await startBuilding.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(signInBg).not.toEqual(startBg);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(overflow).toBe(false);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `hero-${width}.png`),
        fullPage: false,
      });
    });

    test(`architecture chapter visible on slide 02 (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator(".abx-premium-hero-carousel").waitFor({ state: "visible", timeout: 60_000 });

      await page.getByRole("button", { name: /Show slide 2: How Abraxas works/i }).click();
      await page.locator(".abx-premium-hero-carousel--architecture").waitFor({ state: "attached", timeout: 15_000 });

      const architectureTitle = page.getByRole("heading", { name: /Trust is continuous/i });
      await expect(architectureTitle).toBeVisible();

      const inputsStage = page.getByText("01", { exact: true }).first();
      await expect(inputsStage).toBeVisible();

      const scrollRegion = page.locator(".abx-premium-hero-carousel__diagram-scroll");
      await expect(scrollRegion).toBeVisible();

      const beforeScroll = await scrollRegion.evaluate((el) => el.scrollLeft);
      await scrollRegion.evaluate((el) => {
        el.scrollBy({ left: 280, behavior: "auto" });
      });
      await page.waitForTimeout(200);
      const afterScroll = await scrollRegion.evaluate((el) => el.scrollLeft);
      expect(afterScroll).toBeGreaterThan(beforeScroll);

      await expect(page.getByText("Portable verification", { exact: false })).toBeVisible();

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `architecture-${width}.png`),
        fullPage: false,
      });
    });
  }

  test("globe animation container remains on hero slide", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator(".abx-premium-hero__visual-wrap").waitFor({ state: "visible", timeout: 60_000 });
    const visual = page.locator(".abx-premium-hero__visual-wrap");
    await expect(visual).toBeVisible();
    const box = await visual.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(120);
  });
});
