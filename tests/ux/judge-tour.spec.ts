import { test, expect } from "@playwright/test";

test.describe("Judge product tour (simulated)", () => {
  test("completes simulated walkthrough without wallet", async ({ page }) => {
    await page.goto("/experience/tour");
    await expect(
      page.getByText(/Simulated demonstration — no real credentials/i),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: /Traditional apps ask for everything/i })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Simulate first verification approved" }).click();

    await expect(page.getByRole("heading", { name: /Cielo guest eligibility/i })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Simulate explicit consent" }).click();

    await expect(page.getByText(/sim_dr_cielo_demo/i)).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: /Good Trouble 21\+ \(simulated\)/i })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Simulate consent (reuse, no new documents)" }).click();

    await expect(page.getByRole("heading", { name: /You saw the Abraxas difference/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Passport" })).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/judge-tour-complete.png", fullPage: true });
  });

  test("mobile viewport renders tour", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/experience/tour");
    await expect(page.getByRole("heading", { name: /Traditional apps ask for everything/i })).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/judge-tour-mobile-390.png", fullPage: true });
  });
});
