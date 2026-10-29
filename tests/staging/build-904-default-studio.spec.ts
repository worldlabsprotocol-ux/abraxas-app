// FILE: tests/staging/build-904-default-studio.spec.ts
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-904";

test.describe("Build 904 default Integration Studio", () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test("direct entry shows beginner create task not legacy dashboard", async ({ page, baseURL }) => {
    const base = baseURL ?? "http://127.0.0.1:3000";
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/developers/integration-studio#request`, { waitUntil: "networkidle" });
    await expect(page.locator(".abx-studio-workspace--beginner")).toBeVisible({ timeout: 25_000 });
    await expect(page.locator(".abx-studio-workspace__nav")).toHaveCount(0);
    await expect(page.locator(".abx-studio-workspace__inspector")).toHaveCount(0);
    await expect(page.getByText("Verification requests require a sandbox application")).toHaveCount(0);
    await expect(
      page.locator(
        '[data-testid="beginner-create-test-app"], [data-testid="beginner-sign-in-required"], [data-testid="beginner-session-loading"], [data-testid="builder-run-test-minimal"], [data-testid="builder-integration-journey"]',
      ),
    ).toHaveCount(1);
    await page.screenshot({ path: `${ARTIFACT_DIR}/direct-studio-desktop.png`, fullPage: true });
  });

  test("mobile direct entry has no horizontal overflow", async ({ page, baseURL }) => {
    const base = baseURL ?? "http://127.0.0.1:3000";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/developers/integration-studio`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
    expect(overflow).toBe(true);
    await page.screenshot({ path: `${ARTIFACT_DIR}/direct-studio-mobile.png`, fullPage: true });
  });

  test("advanced=1 exposes legacy lifecycle navigation", async ({ page, baseURL }) => {
    const base = baseURL ?? "http://127.0.0.1:3000";
    await page.goto(`${base}/developers/integration-studio?advanced=1#policy`);
    await expect(page.locator(".abx-studio-workspace__nav")).toHaveCount(1);
    await expect(page.locator(".abx-studio-workspace__inspector")).toHaveCount(1);
  });
});
