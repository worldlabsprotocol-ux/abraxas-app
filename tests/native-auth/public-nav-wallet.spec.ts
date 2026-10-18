import { test, expect } from "@playwright/test";

test.describe("Connect Wallet", () => {
  test("opens wallet panel with guidance when no extension", async ({ page }) => {
    await page.route("**/api/auth/native/enabled", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ enabled: true, operational: false }),
      }),
    );
    await page.route("**/api/auth/native/session", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: false }) }),
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /Connect a supported Sui wallet/i }).click();
    const dialog = page.getByRole("dialog", { name: /Wallet connection/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/does not sign you into an Abraxas account/i)).toBeVisible();
  });
});
