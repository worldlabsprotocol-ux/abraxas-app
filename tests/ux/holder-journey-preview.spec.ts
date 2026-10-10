import { test, expect } from "@playwright/test";

/**
 * Mocked partner verify surfaces (PARTNER_VERIFY_PREVIEW_CONTROLS=1).
 * Does not call live evaluate or issue receipts.
 */
test.describe("Partner verify preview (mocked UI states)", () => {
  test("denied consent shows recovery without auto-consent", async ({ page }) => {
    await page.goto(
      "/partner/verify?preview_phase=denied&preview_partner_name=Cielo&preview_signin_configured=1",
    );
    await expect(page.locator(".abx-verification-failure")).toContainText(/couldn't confirm/i);
    await expect(page.getByText("Nothing was shared.")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/partner-denied-preview.png", fullPage: true });
  });

  test("pending IDV preview state", async ({ page }) => {
    await page.goto(
      "/partner/verify?preview_phase=pending_review&preview_partner_name=Good%20Trouble&preview_signin_configured=1",
    );
    await expect(page.getByText(/Good Trouble|under review|review/i).first()).toBeVisible();
  });

  test("session required preview at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(
      "/partner/verify?preview_phase=sign_in&preview_partner_name=Demo&preview_signin_configured=1",
    );
    await expect(page.getByRole("button", { name: /Continue|Sign/i }).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/partner-sign-in-375.png", fullPage: true });
  });
});
