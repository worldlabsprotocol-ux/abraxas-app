import { test, expect } from "@playwright/test";

test.describe("Judge product tour (simulated)", () => {
  test("completes simulated walkthrough without wallet", async ({ page }) => {
    await page.goto("/experience/tour");
    await expect(
      page.getByText(/Simulated demonstration — no real credentials/i),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: /Verify once/i })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Simulate verification approved" }).click();

    await expect(page.getByRole("heading", { name: /Cielo verified-rate request/i })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Simulate consent to share narrow result" }).click();

    await expect(page.getByText(/sim_dr_cielo_demo/i)).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: /Good Trouble 21\+ request/i })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Simulate consent (no new documents)" }).click();

    await expect(page.getByRole("heading", { name: /Tour complete/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open real Passport" })).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/judge-tour-complete.png", fullPage: true });
  });

  test("mobile viewport renders tour", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/experience/tour");
    await expect(page.getByRole("heading", { name: /Verify once/i })).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/judge-tour-mobile-390.png", fullPage: true });
  });
});
