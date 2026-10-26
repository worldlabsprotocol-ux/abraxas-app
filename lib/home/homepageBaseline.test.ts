// FILE: lib/home/homepageBaseline.test.ts
// Static guards — institutional homepage must not regress without explicit redesign PR.

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing protected file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("homepage baseline (institutional invariants)", () => {
  it("Protocol in Action renders partner media marks", () => {
    const src = read("components/home/HomeProtocolInAction.tsx");
    expect(src).toContain("PROTOCOL_PROOF_LOGOS");
    expect(src).toContain("ProofMediaMark");
    expect(src).toContain("abx-home-proof-grid");
    expect(src).toContain("abx-home-section-center");
  });

  it("public homepage leads with cinematic editorial composition", () => {
    const page = read("app/page.tsx");
    expect(page).toContain("PremiumHomeHeroCarousel");
    const shell = read("components/redesign/RedesignHome.tsx");
    const unified = read("components/home/HomeUnifiedProductEntry.tsx");
    expect(shell).toContain("hero");
    expect(shell).toContain("HomeUnifiedProductEntry");
    expect(shell).not.toContain("HomeGoodTroubleActionSection");
    expect(shell).toContain("HomeProtocolSignalMarquee");
    expect(unified).toContain("HomeNativeSandboxChapter");
    expect(unified).not.toContain("HomeHowAbraxasWorksSection");
    const hero = read("components/home/premium/PremiumHomeHero.tsx");
    expect(hero).toContain("PROTOCOL_HERO_TITLE");
    const positioning = read("lib/home/protocolPositioningCopy.ts");
    expect(positioning).toContain("Trust decisions. Independently verified.");
    expect(hero).toContain("abx-premium-hero--enhanced");
    const protocol = read("components/home/HomeProtocolInfrastructureSection.tsx");
    expect(protocol).toContain("HomeProtocolInfrastructureSection");
  });

  it("homepage typography CSS tokens exist", () => {
    const css = read("app/globals.css");
    expect(css).toContain(".abx-home-section-center");
    expect(css).toContain(".abx-institutional-home");
    expect(css).toContain(".abx-command-center");
    expect(css).toContain("@keyframes abx-marquee-scroll");
  });

  it("protocol proof asset modules are present", () => {
    read("lib/home/protocolProofLogos.ts");
    read("lib/home/protocolProofMedia.ts");
    const logos = read("lib/home/protocolProofLogos.ts");
    expect(logos).toContain("cielo");
    expect(logos).toContain("chickasaw");
    expect(logos).toContain("good-trouble");
  });

  it("motion primitives honor reduced motion", () => {
    const marquee = read("components/home/HomeProtocolSignalMarquee.tsx");
    expect(marquee).toContain("useReducedMotion");
    const css = read("app/globals.premium-home.css");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("abx-protocol-marquee-scroll");
  });
});
