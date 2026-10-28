// FILE: tests/staging/build-884-architecture-visuals.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Build 884 architecture visuals", () => {
  test("stage selection updates the visible architecture image", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Show slide 2/i }).click();
    const stageImage = page.locator(".abx-trust-continuous-arch__stage-image");
    await expect(stageImage).toBeVisible();
    await expect(stageImage).toHaveAttribute("src", /stage-01-request/);

    await page.getByRole("button", { name: /03.*Independent verification/i }).click();
    await expect(page.getByText(/Anyone can verify the result independently/i)).toBeVisible();
    await expect(stageImage).toHaveAttribute("src", /stage-03-verification/);

    await page.getByRole("button", { name: /View full architecture/i }).click();
    await expect(page.locator(".abx-trust-continuous-arch__overview-image")).toBeVisible();
    await expect(stageImage).toHaveCount(0);
  });

  test("mobile stage 04 visual fits without horizontal page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: /Show slide 2/i }).click();
    await page.getByRole("button", { name: /04.*Application action/i }).click();
    await expect(page.locator(".abx-trust-continuous-arch__stage-image")).toHaveAttribute(
      "src",
      /stage-04-action/,
    );
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflowX).toBe(false);
  });
});
