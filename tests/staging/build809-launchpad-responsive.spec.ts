import { expect, test } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL ?? process.env.LAUNCHPAD_STAGING_URL ?? "https://demo.abraxasworld.xyz";

/**
 * Build #809 — Launchpad readable at 100% zoom (no horizontal clip on main workflow).
 */
test.describe("Build #809 Launchpad responsive integrity", () => {
  test("holder preview card fits viewport at 1024px", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(`${base}/developers/launchpad`, { waitUntil: "domcontentloaded" });

    const holderCard = page.locator(".abx-holder-verification-request").first();
    if ((await holderCard.count()) === 0) {
      test.skip(true, "Sign in required — holder preview not visible on this run");
    }

    const box = await holderCard.boundingBox();
    test.skip(!box, "Holder card not laid out");
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1024 + 2);

    const overflowX = await holderCard.evaluate((el) => {
      const node = el as HTMLElement;
      return node.scrollWidth - node.clientWidth;
    });
    expect(overflowX).toBeLessThanOrEqual(4);
  });

  test("handoff controls use stateful actions when present", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/developers/launchpad`, { waitUntil: "domcontentloaded" });

    const handoff = page.locator(".abx-launchpad-handoff-controls").first();
    if ((await handoff.count()) === 0) {
      test.skip(true, "Handoff controls require authenticated Launchpad session");
    }

    await expect(handoff.getByRole("button", { name: /Create handoff|Start another verification|View completed result/i }).first()).toBeVisible();
  });
});
