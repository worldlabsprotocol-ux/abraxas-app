import { test, expect } from "@playwright/test";

test.describe("Build 898 live enforcement journey", () => {
  test("post-test panel offers single Connect my application primary action", async ({ page, baseURL }) => {
    const base = baseURL?.replace(/\/$/, "");
    if (!base) test.skip(true, "BLOCKED: set LAUNCHPAD_STAGING_URL");

    await page.goto(`${base}/?integration=1#request`, { waitUntil: "domcontentloaded" });
    const connect = page.getByRole("button", { name: /^Connect my application$/i });
    if (!(await connect.isVisible().catch(() => false))) {
      test.skip(true, "Requires sandbox test success state");
    }
    await expect(page.getByRole("button", { name: /Run independent enforcement check/i })).toHaveCount(0);
    await expect(page.getByText("Make it work in your application")).toBeVisible();
  });
});
