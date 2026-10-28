// FILE: tests/staging/build-882-product-continuity.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Build 882 product continuity", () => {
  test("homepage architecture stages are navigable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: /Show slide 2/i }).click();
    await expect(page.getByRole("navigation", { name: /Architecture stages/i })).toBeVisible();
    await page.getByRole("button", { name: /02.*Abraxas decision/i }).click();
    await expect(page.getByText(/Abraxas checks the evidence/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /View full architecture/i })).toBeVisible();
  });

  test("Abraxas Guide opens from header", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Guide$/i }).click();
    await expect(page.getByRole("dialog", { name: /Abraxas Guide/i })).toBeVisible();
    await page.getByPlaceholder(/Proof, workspace/i).fill("indeterminate");
    await expect(page.getByText(/Permit, deny, indeterminate/i)).toBeVisible();
  });
});
