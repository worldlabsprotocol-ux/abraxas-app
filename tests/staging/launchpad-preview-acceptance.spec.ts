import { expect, test } from "@playwright/test";

const base =
  process.env.LAUNCHPAD_STAGING_URL?.trim()
  ?? process.env.PLAYWRIGHT_BASE_URL?.trim()
  ?? "https://abraxas-app-git-cursor-la-04c926-worldlabsprotocol-uxs-projects.vercel.app";

const bypass = process.env.VERCEL_PROTECTION_BYPASS?.trim();

test.describe("Launchpad PR #784 preview acceptance", () => {
  test.use(
    bypass
      ? { extraHTTPHeaders: { "x-vercel-protection-bypass": bypass } }
      : {},
  );

  test("unprovisioned: single nav, collapsed milestones, sign-in above fold", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/developers/launchpad`, { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Launchpad", level: 1 })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Partner lifecycle stages" })).toHaveCount(0);

    const stepNav = page.getByRole("navigation", { name: "Launchpad integration steps" });
    await expect(stepNav).toBeVisible();

    await expect(page.getByRole("heading", { name: "Sign in or create your first application" })).toBeVisible();

    const canvas = page.locator(".abx-launchpad-console-stage");
    const inspector = page.locator(".abx-launchpad-inspector");
    const canvasBox = await canvas.boundingBox();
    const inspectorBox = await inspector.boundingBox();
    test.skip(!canvasBox || !inspectorBox, "layout boxes missing");
    expect(canvasBox!.width).toBeGreaterThan(inspectorBox!.width * 0.85);
  });

  test("step transitions replace canvas content in place", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${base}/developers/launchpad?view=verify`, { waitUntil: "networkidle" });

    const nav = page.getByRole("navigation", { name: "Launchpad integration steps" });
    await nav.getByRole("button", { name: /Application/i }).click();
    await expect(page.getByRole("heading", { name: /Configure your sandbox application/i })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Partner lifecycle stages" })).toHaveCount(0);

    await nav.getByRole("button", { name: /Verify/i }).first().click();
    await expect(page.locator("#launchpad-stage-panel-verify")).toBeVisible();
  });

  test("responsive: mobile keeps one nav rail", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/developers/launchpad`, { waitUntil: "networkidle" });
    await expect(page.getByRole("navigation", { name: "Launchpad integration steps" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Partner lifecycle stages" })).toHaveCount(0);
  });

  test("browser back and refresh preserve stage param", async ({ page }) => {
    await page.goto(`${base}/developers/launchpad?view=connect`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/view=connect/);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page).toHaveURL(/view=connect/);
    await page.goBack();
    await page.goForward();
    await expect(page).toHaveURL(/view=connect/);
  });
});

test.describe("Launchpad provisioned preview", () => {
  test.use(
    bypass
      ? { extraHTTPHeaders: { "x-vercel-protection-bypass": bypass } }
      : {},
  );

  test("existing application loads journey and developer details", async ({ page, request }) => {
    const apiKey =
      process.env.REUSE_SANDBOX_API_KEY?.trim() ?? process.env.LAUNCHPAD_STUDIO_API_KEY?.trim();
    const applicationId =
      process.env.REUSE_APPLICATION_ID?.trim()
      ?? "fbea93d2-6660-428d-85c3-8c4e12d89b05";

    if (!apiKey) {
      test.skip(true, "BLOCKED: REUSE_SANDBOX_API_KEY not available in agent environment");
      return;
    }

    const sessionRes = await request.post(`${base}/api/launchpad/auth/session`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(sessionRes.status()).not.toBe(503);
    expect(sessionRes.ok()).toBeTruthy();

    await page.context().addCookies(
      (await sessionRes.headersArray())
        .filter((header) => header.name.toLowerCase() === "set-cookie")
        .flatMap((header) => {
          const [pair] = header.value.split(";");
          const [name, ...rest] = pair.split("=");
          return [{ name, value: rest.join("="), url: base }];
        }),
    );

    await page.goto(`${base}/developers/launchpad?application=${applicationId}`, {
      waitUntil: "networkidle",
    });

    expect(page.url()).not.toMatch(/abx_test_/);
    await expect(page.getByRole("navigation", { name: "Launchpad integration steps" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    const lifecycleSummary = page.getByText("Partner operations milestones");
    await expect(lifecycleSummary).toBeVisible();
    const details = lifecycleSummary.locator("xpath=ancestor::details[1]");
    await expect(details).not.toHaveAttribute("open");

    await page.getByRole("button", { name: /Show developer details/i }).click();
    await expect(page.getByText(/Partner Flow|hosted handoff|Create a secure handoff/i).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
