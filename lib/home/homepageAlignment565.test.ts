// FILE: lib/home/homepageAlignment565.test.ts

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { HOMEPAGE_FOUR_PILLARS } from "./homepageAlignment565Copy";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("homepage alignment (#550–#565)", () => {
  it("surfaces four capability pillars on RedesignHome", () => {
    const home = read("components/redesign/RedesignHome.tsx");
    expect(home).toContain("HomeProtocolPillarsSection");
    expect(HOMEPAGE_FOUR_PILLARS).toHaveLength(4);
    expect(HOMEPAGE_FOUR_PILLARS.map((p) => p.id)).toEqual([
      "passport",
      "sovereign",
      "independent",
      "privacy",
    ]);
  });

  it("hero routes to Passport and partner integration", () => {
    const hero = read("components/home/premium/PremiumHomeHero.tsx");
    expect(hero).toContain("CINEMATIC_HOME_CTA_PRIMARY_HREF");
    const copy = read("lib/home/cinematicHomeCopy.ts");
    expect(copy).toContain('CINEMATIC_HOME_CTA_PRIMARY = "Open Passport"');
    expect(copy).toContain('CINEMATIC_HOME_CTA_PRIMARY_HREF = "/passport"');
    expect(copy).toContain("integration-studio");
    expect(copy).not.toMatch(/full decentral/i);
    expect(copy).not.toMatch(/universal institutional acceptance/i);
  });

  it("does not claim zero-knowledge selective disclosure on homepage pillars", () => {
    const pillars = read("lib/home/homepageAlignment565Copy.ts");
    expect(pillars).toMatch(/not zero-knowledge selective disclosure/i);
    expect(pillars).toMatch(/not production certification/i);
  });
});
