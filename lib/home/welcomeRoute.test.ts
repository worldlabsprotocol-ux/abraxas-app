import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("welcome route continuity", () => {
  it("redirects /welcome to homepage sandbox chapter", () => {
    const welcome = read("app/welcome/page.tsx");
    expect(welcome).toContain("WelcomeRouteContinuity");
    expect(welcome).not.toContain("ContentCard");
    const continuity = read("components/welcome/WelcomeRouteContinuity.tsx");
    expect(continuity).toContain("/#start-sandbox");
  });

  it("embeds focused sandbox entry in unified post-hero region", () => {
    const unified = read("components/home/HomeUnifiedProductEntry.tsx");
    expect(unified).toContain("HomeNativeSandboxChapter");
    const chapter = read("components/home/HomeNativeSandboxChapter.tsx");
    expect(unified).toContain('id="start-sandbox"');
    expect(chapter).not.toContain('id="start-sandbox"');
    expect(chapter).toContain("HomeSandboxSessionEntry");
    expect(chapter).not.toContain("AbraxasHeroCenterpiece");
    expect(chapter).not.toContain("HomeTrustPipelineStrip");
  });

  it("hero keeps product-first CTAs and adds sandbox deep link", () => {
    const hero = read("components/home/premium/PremiumHomeHero.tsx");
    expect(hero).toContain("CINEMATIC_HOME_CTA_PRIMARY_HREF");
    expect(hero).toContain("CINEMATIC_HOME_CTA_PRIMARY");
    expect(hero).toContain("PremiumHomeHeroVisualEnhanced");
  });
});
