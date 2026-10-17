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

  it("embeds native sandbox in premium homepage build chapter", () => {
    const home = read("components/redesign/RedesignHome.tsx");
    expect(home).toContain("HomeNativeSandboxChapter");
    const chapter = read("components/home/HomeNativeSandboxChapter.tsx");
    expect(chapter).toContain('id="start-sandbox"');
    expect(chapter).toContain("AbraxasHeroCenterpiece");
    expect(chapter).toContain("WelcomeStartSandboxFlow");
    expect(chapter).toContain("HomeTrustPipelineStrip");
  });

  it("hero keeps product-first CTAs and adds sandbox deep link", () => {
    const hero = read("components/home/premium/PremiumHomeHero.tsx");
    expect(hero).toContain("CINEMATIC_HOME_CTA_SANDBOX_HREF");
    expect(hero).toContain("PremiumHomeHeroVisualEnhanced");
  });
});
