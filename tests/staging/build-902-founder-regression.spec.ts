// FILE: tests/staging/build-902-founder-regression.spec.ts
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-902";

test.describe("Build 902 founder regressions", () => {
  test.beforeAll(() => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
  });

  test("beginner journey shell is centered and not narrow-left squeezed", async ({ page, baseURL }) => {
    const base = baseURL ?? "http://127.0.0.1:3000";
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/developers/integration-studio#request`);
    const shell = page.locator(".abx-builder-journey-shell__inner, .abx-builder-journey-shell").first();
    await expect(shell).toBeVisible({ timeout: 20_000 });
    const box = await shell.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (box && viewport) {
      const centerX = box.x + box.width / 2;
      const viewportCenter = viewport.width / 2;
      expect(Math.abs(centerX - viewportCenter)).toBeLessThan(viewport.width * 0.12);
      expect(box.width).toBeGreaterThan(280);
    }
    await page.screenshot({ path: `${ARTIFACT_DIR}/journey-desktop-centered.png`, fullPage: true });
  });

  test("mobile journey shell fits viewport without horizontal overflow", async ({ page, baseURL }) => {
    const base = baseURL ?? "http://127.0.0.1:3000";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/developers/integration-studio#request`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
    expect(overflow).toBe(true);
    await page.screenshot({ path: `${ARTIFACT_DIR}/journey-mobile.png`, fullPage: true });
  });

  test("Try an example stays in workspace and does not open legacy studio", async ({ page, baseURL }) => {
    const base = baseURL ?? "http://127.0.0.1:3000";
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${base}/developers/integration-studio#request`);

    await page.evaluate(() => {
      sessionStorage.setItem(
        "abx_home_builder_discovery_v1",
        JSON.stringify({ platform: "website", policyPackId: "wallet_control", integrationStack: null }),
      );
      sessionStorage.setItem("abx_builder_harness_success_v1_demo", JSON.stringify({
        tone: "success",
        headline: "Your test worked.",
        summary: "Sandbox allow outcome.",
        receiptId: "dr_harness_demo",
      }));
    });

    await page.reload();

    const tryExample = page.getByRole("button", { name: "Try an example" });
    if (await tryExample.count()) {
      await tryExample.first().click();
      await expect(page.locator("[data-testid=builder-reference-example]")).toBeVisible();
      expect(page.url()).not.toContain("advanced=1");
      await expect(page.locator(".abx-studio-workspace__inspector")).toHaveCount(0);
      await page.screenshot({ path: `${ARTIFACT_DIR}/example-in-workspace.png`, fullPage: true });
    }
  });
});
