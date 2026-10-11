import { test, expect } from "@playwright/test";

/**
 * Build #519 acceptance matrix — mocked/preview routes unless noted.
 * Requires PARTNER_VERIFY_PREVIEW_CONTROLS via playwright.ux.config webServer.
 */

test.describe("Acceptance matrix (Build #519)", () => {
  test("first-time holder sign-in preview (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/partner/verify?preview_phase=sign_in&preview_partner_name=Demo&preview_signin_configured=1");
    await expect(page.getByRole("button", { name: /Continue|Connect|Sign/i }).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/519-first-time-sign-in-mobile.png", fullPage: true });
  });

  test("pending review holder state", async ({ page }) => {
    await page.goto("/partner/verify?preview_phase=pending_review&preview_partner_name=Good%20Trouble&preview_signin_configured=1");
    await expect(page.getByText(/review/i).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/519-pending-review.png", fullPage: true });
  });

  test("denied consent recovery", async ({ page }) => {
    await page.goto("/partner/verify?preview_phase=denied&preview_partner_name=Cielo&preview_signin_configured=1");
    await expect(page.getByText("Nothing was shared.")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/519-denied-consent.png", fullPage: true });
  });

  test("approved sandbox result", async ({ page }) => {
    await page.goto("/partner/verify?preview_phase=approved&preview_partner_name=Sandbox%20Demo&preview_signin_configured=1&preview_environment=sandbox");
    await expect(page.locator(".abx-holder-success, .abx-decision-receipt").first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/519-approved-sandbox.png", fullPage: true });
  });

  test("Cielo verified-rate continuity copy", async ({ page }) => {
    await page.goto("/cielo/verified-rate");
    await expect(page.getByText(/not a hotel booking/i).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/519-cielo-rate.png", fullPage: true });
  });

  test("judge tour simulation badge (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/experience/tour");
    await expect(page.getByText(/Simulated demonstration/i)).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/519-judge-tour-desktop.png", fullPage: true });
  });

  test("partner launchpad operator path", async ({ page }) => {
    await page.goto("/developers/launchpad");
    await expect(page.getByText(/Choose what you need to verify/i).first()).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/519-launchpad.png", fullPage: true });
  });

  test("integration studio guided strip", async ({ page }) => {
    await page.goto("/developers/integration-studio");
    await expect(page.getByText(/Guided path/i)).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/519-integration-studio.png", fullPage: true });
  });

  test("homepage demo CTA preserved", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Explore the demo/i })).toBeVisible();
  });
});
