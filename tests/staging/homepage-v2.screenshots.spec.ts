import { test } from "@playwright/test";
import path from "node:path";

const OUT = "/opt/cursor/artifacts";

const shots = [
  { file: "homepage-v2-desktop-1440.png", width: 1440, height: 900 },
  { file: "homepage-v2-mobile-390.png", width: 390, height: 844 },
  { file: "verify-workbench-desktop.png", width: 1440, height: 900, path: "/verify" },
  { file: "integration-studio-desktop.png", width: 1440, height: 900, path: "/developers/integration-studio" },
  { file: "passport-desktop.png", width: 1440, height: 900, path: "/passport" },
  { file: "admin-dashboard-desktop.png", width: 1440, height: 900, path: "/admin/dashboard" },
] as const;

test.describe("V2 surface screenshots", () => {
  for (const shot of shots) {
    test(`capture ${shot.file}`, async ({ page }) => {
      await page.setViewportSize({ width: shot.width, height: shot.height });
      await page.goto(shot.path ?? "/", { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(OUT, shot.file), fullPage: true });
    });
  }
});
