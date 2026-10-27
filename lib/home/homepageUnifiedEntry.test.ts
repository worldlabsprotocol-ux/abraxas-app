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
    expect(unified).toContain("chapter-evidence");
    expect(unified).toContain("chapter-build-wrap");
    expect(unified).toContain("chapter-how");
  });

  it("uses a concise unified entry eyebrow", () => {
    expect(HOMEPAGE_UNIFIED_EYEBROW.length).toBeGreaterThan(0);
    expect(HOMEPAGE_UNIFIED_EYEBROW).toMatch(/Abraxas/i);
  });

  it("wires the homepage hero carousel as the primary introduction", () => {
    const page = readFileSync(join(ROOT, "app/page.tsx"), "utf8");
    expect(page).toContain("PremiumHomeHeroCarousel");
    expect(page).toContain("<RedesignHome hero={<PremiumHomeHeroCarousel />} />");
  });
});
