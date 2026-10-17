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
  it("surfaces consolidated trust narrative on RedesignHome", () => {
    const home = read("components/redesign/RedesignHome.tsx");
    expect(home).toContain("HomeHowAbraxasWorksSection");
    expect(HOMEPAGE_FOUR_PILLARS).toHaveLength(4);
    expect(HOMEPAGE_FOUR_PILLARS.map((p) => p.id)).toEqual([
      "passport",
      "sovereign",
      "independent",
      "privacy",
    ]);
  });

  it("hero prioritizes sandbox entry and how-it-works anchor", () => {
    const hero = read("components/home/premium/PremiumHomeHero.tsx");
    expect(hero).toContain("CINEMATIC_HOME_CTA_PRIMARY_HREF");
    const copy = read("lib/home/cinematicHomeCopy.ts");
    expect(copy).toContain('CINEMATIC_HOME_CTA_PRIMARY = "Start sandbox"');
    expect(copy).toContain('CINEMATIC_HOME_CTA_PRIMARY_HREF = "#start-sandbox"');
    expect(copy).toContain("#how-abraxas-works");
    expect(copy).not.toMatch(/full decentral/i);
    expect(copy).not.toMatch(/universal institutional acceptance/i);
  });

  it("does not claim zero-knowledge selective disclosure on homepage pillars", () => {
    const pillars = read("lib/home/homepageAlignment565Copy.ts");
    expect(pillars).toMatch(/not zero-knowledge selective disclosure/i);
    expect(pillars).toMatch(/not production certification/i);
  });

  it("distinguishes partner-bound receipts from future universal Passport reuse", () => {
    const copy = read("lib/home/homepageAlignment565Copy.ts");
    expect(copy).toMatch(/partner-bound authorization receipts/i);
    expect(copy).toMatch(/roadmap goal/i);
    const section = read("components/home/HomeProtocolPillarsSection.tsx");
    expect(section).toContain("HOMEPAGE_RECEIPT_SCOPE_NOTE");
  });

  it("pillar and hero CTAs reference existing app routes", () => {
    for (const pillar of HOMEPAGE_FOUR_PILLARS) {
      expect(pillar.href.startsWith("/") || pillar.href.startsWith("#")).toBe(true);
      if (pillar.href.startsWith("/")) {
        const routePath = pillar.href.split("?")[0];
        const appFile = resolve(ROOT, `app${routePath}/page.tsx`);
        const altFile = resolve(ROOT, `app${routePath}/page.ts`);
        expect(existsSync(appFile) || existsSync(altFile), `route ${routePath}`).toBe(true);
      }
    }
    expect(existsSync(resolve(ROOT, "app/passport/page.tsx"))).toBe(true);
    expect(existsSync(resolve(ROOT, "app/developers/passport-portable-trust/page.tsx"))).toBe(true);
  });
});
