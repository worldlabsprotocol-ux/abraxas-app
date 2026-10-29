// FILE: tests/staging/build-901-beginner-ui-screenshot.spec.ts
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-901";

test.describe("Build 901 beginner UI screenshots", () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test("standalone studio hides inspector rail by default", async ({ page, baseURL }) => {
    const base = baseURL ?? "http://127.0.0.1:3000";
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/developers/integration-studio#request`);
    await expect(page.locator(".abx-studio-workspace__inspector")).toHaveCount(0);
    await page.screenshot({ path: `${ARTIFACT_DIR}/integration-studio-desktop-no-inspector.png`, fullPage: true });
  });

  test("standalone studio mobile width hides inspector", async ({ page, baseURL }) => {
    const base = baseURL ?? "http://127.0.0.1:3000";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/developers/integration-studio#request`);
    await expect(page.locator(".abx-studio-workspace__inspector")).toHaveCount(0);
    await page.screenshot({ path: `${ARTIFACT_DIR}/integration-studio-mobile-no-inspector.png`, fullPage: true });
  });
});
