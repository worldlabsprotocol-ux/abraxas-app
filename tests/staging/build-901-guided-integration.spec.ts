// FILE: tests/staging/build-901-guided-integration.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Build 901 guided integration journey", () => {
  test("website stack picker appears before starter kit action", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      sessionStorage.setItem(
        "abx_home_builder_discovery_v1",
        JSON.stringify({
          platform: "website",
          policyPackId: "wallet_control",
          updatedAt: new Date().toISOString(),
        }),
      );
    });
    await page.goto("/developers/integration-studio");
    const journey = page.getByTestId("builder-integration-journey");
    await expect(journey).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("builder-stack-picker")).toBeVisible();
    await expect(page.getByRole("button", { name: "Get integration files" })).toHaveCount(0);
  });
});
