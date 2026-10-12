import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.LAUNCHPAD_STAGING_URL ?? "http://127.0.0.1:3000";

const SURFACES = [
  { name: "integration-studio", path: "/developers/integration-studio" },
  { name: "launchpad", path: "/developers/launchpad" },
  { name: "passport", path: "/passport" },
  { name: "governance", path: "/admin/governance" },
] as const;

for (const surface of SURFACES) {
  test(`axe WCAG scan: ${surface.name}`, async ({ page }) => {
    await page.goto(`${base}${surface.path}`, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );

    if (serious.length > 0) {
      console.log(JSON.stringify(serious, null, 2));
    }

    expect(
      serious,
      `${surface.name} must not have serious/critical axe violations`,
    ).toEqual([]);
  });
}
