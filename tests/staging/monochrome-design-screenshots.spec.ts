import { test, expect } from "@playwright/test";

const base = process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3007";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const SURFACES = [
  { slug: "homepage", path: "/" },
  { slug: "passport", path: "/passport" },
  { slug: "integration-studio", path: "/developers/integration-studio" },
  { slug: "launchpad", path: "/developers/launchpad" },
  { slug: "verify", path: "/verify" },
  { slug: "governance", path: "/admin/governance" },
] as const;

for (const surface of SURFACES) {
  for (const vp of VIEWPORTS) {
    test(`${surface.slug} ${vp.name}`, async ({ page }) => {
      const tag = process.env.MONOCHROME_SHOT_TAG ?? "capture";
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${base}${surface.path}`, { waitUntil: "networkidle" });
      await expect(page.locator("body")).toBeVisible();
      await page.screenshot({
        path: `/opt/cursor/artifacts/monochrome-${tag}-${surface.slug}-${vp.name}.png`,
        fullPage: surface.slug !== "homepage",
      });
    });
  }
}
