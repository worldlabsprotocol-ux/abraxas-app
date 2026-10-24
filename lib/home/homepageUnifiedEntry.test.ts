import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOMEPAGE_UNIFIED_EYEBROW } from "@/lib/home/homepageUnifiedEntryCopy";

const ROOT = process.cwd();

describe("homepage unified product entry", () => {
  it("consolidates post-hero sections without premium chapter rails", () => {
    const home = readFileSync(join(ROOT, "components/redesign/RedesignHome.tsx"), "utf8");
    expect(home).toContain("HomeUnifiedProductEntry");
    expect(home).not.toContain("PremiumHomeChapter");
  });

  it("preserves deep-link anchors for legacy hash routes", () => {
    const unified = readFileSync(join(ROOT, "components/home/HomeUnifiedProductEntry.tsx"), "utf8");
    expect(unified).toContain("start-sandbox");
    expect(unified).toContain("how-abraxas-works");
    expect(unified).toContain('id="chapter-evidence"');
    expect(unified).toContain('id="chapter-build-wrap"');
    expect(unified).toContain("chapter-how");
  });

  it("uses Start with Abraxas as unified entry eyebrow", () => {
    expect(HOMEPAGE_UNIFIED_EYEBROW).toMatch(/Start with Abraxas/i);
  });

  it("does not modify the hero component wiring on the homepage", () => {
    const page = readFileSync(join(ROOT, "app/page.tsx"), "utf8");
    expect(page).toContain("PremiumHomeHero");
    expect(page).toContain("<RedesignHome hero={<PremiumHomeHero />} />");
  });
});
