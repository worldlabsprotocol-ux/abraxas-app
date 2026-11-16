// FILE: tests/staging/verify-independent-acceptance.spec.ts
// BUILD #966 — default /verify independent flow acceptance (hosted demo).

import { expect, test } from "@playwright/test";

const DEMO_SCENARIOS = [
  { id: "valid", verdict: "Valid" },
  { id: "wrong_audience", verdict: "Wrong audience" },
  { id: "revoked", verdict: "Revoked" },
  { id: "stale_status", verdict: "Needs fresh status" },
  { id: "tampered_signature", verdict: "Not valid" },
] as const;

test.describe("Independent verification default /verify", () => {
  test("entry keeps verification as the only primary actions", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.getByRole("heading", { name: "Verify a receipt independently" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Use demo receipt" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Paste my receipt" })).toBeVisible();
    await expect(page.getByText("Next: verify offline", { exact: false })).toHaveCount(0);
  });

  test("valid demo shows verdict and next action on default surface", async ({ page }) => {
    await page.goto("/verify");
    await page.getByRole("button", { name: "Use demo receipt" }).click();
    await expect(page.getByText("Verdict", { exact: true })).toBeVisible();
    await expect(page.getByText("Valid", { exact: true })).toBeVisible();
    await expect(page.getByText("What to do next", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try another receipt" })).toBeVisible();
    await page.getByText("Next: verify offline in your environment").click();
    await expect(page.getByText(/not on public npm/i)).toBeVisible();
    await expect(page.getByText(/build831:pack-verifier/)).toBeVisible();
  });

  for (const scenario of DEMO_SCENARIOS.filter((s) => s.id !== "valid")) {
    test(`advanced demo scenario: ${scenario.id}`, async ({ page }) => {
      await page.goto("/verify");
      await page.getByRole("button", { name: "Use demo receipt" }).click();
      await expect(page.getByText("Valid", { exact: true })).toBeVisible({ timeout: 30_000 });
      await page.getByText("Advanced details").click();
      await page.getByRole("button", { name: scenario.id.replace(/_/g, " ") }).click();
      await expect(page.getByText(scenario.verdict, { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("What to do next", { exact: true })).toBeVisible();
    });
  }

  test("malformed paste keeps input and offers recovery", async ({ page }) => {
    await page.goto("/verify");
    await page.getByRole("button", { name: "Paste my receipt" }).click();
    await expect(page.getByText(/Expected shape/i)).toBeVisible();
    const textarea = page.locator("textarea");
    const bad = "BUILD966_POST_MERGE=1";
    await textarea.fill(bad);
    await page.getByRole("button", { name: "Check this bundle" }).click();
    await expect(page.getByText(/doesn't look like a receipt bundle/i)).toBeVisible();
    await expect(textarea).toHaveValue(bad);
    await page.getByRole("button", { name: "Use demo receipt instead" }).click();
    await expect(page.getByText("Valid", { exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test("load teaching sample then verify paste", async ({ page }) => {
    await page.goto("/verify");
    await page.getByRole("button", { name: "Paste my receipt" }).click();
    await page.getByRole("button", { name: "Load teaching sample" }).click();
    await expect(page.getByText(/Teaching sample loaded/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("textarea")).toContainText("abraxas_portable_verification_bundle");
    await page.getByRole("button", { name: "Check this bundle" }).click();
    await expect(page.getByText("Verdict", { exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test("malformed paste recovery on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/verify");
    await page.getByRole("button", { name: "Paste my receipt" }).click();
    await page.locator("textarea").fill("{not-json");
    await page.getByRole("button", { name: "Check this bundle" }).click();
    await expect(page.getByText(/doesn't look like a receipt bundle/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Load teaching sample" })).toBeVisible();
    await expect(page.locator("textarea")).toHaveValue("{not-json");
  });

  test("mobile layout keeps verdict and next action visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/verify");
    await page.getByRole("button", { name: "Use demo receipt" }).click();
    await expect(page.getByText("Valid", { exact: true })).toBeVisible();
    await expect(page.getByText("What to do next", { exact: true })).toBeVisible();
  });
});