import { test } from "@playwright/test";
import path from "path";

const base = process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";
const out = "/opt/cursor/artifacts";

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
] as const;

const surfaces = [
  { slug: "integration-studio", path: "/developers/integration-studio" },
  { slug: "launchpad", path: "/developers/launchpad" },
  { slug: "passport", path: "/passport" },
  { slug: "governance", path: "/admin/governance" },
] as const;

for (const surface of surfaces) {
  for (const vp of viewports) {
    test(`${surface.slug} ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${base}${surface.path}`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: path.join(out, `v2-after-${surface.slug}-${vp.name}.png`),
        fullPage: true,
      });
    });
  }
}
