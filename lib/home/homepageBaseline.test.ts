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
    expect(page).toContain("PremiumHomeHero");
    const shell = read("components/redesign/RedesignHome.tsx");
    expect(shell).toContain("hero");
    expect(shell).toContain("HomeVerificationLifecycle");
    expect(shell).toContain("HomeGoodTroubleActionSection");
    expect(shell).toContain("HomeVerifiableTrustChapter");
    expect(shell).toContain("CapabilityMatrix");
    expect(shell).not.toContain("KineticMarquee");
    const hero = read("components/home/premium/PremiumHomeHero.tsx");
    expect(hero).toContain("Prove what matters");
    expect(hero).toContain("abx-premium-hero--enhanced");
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
    const marquee = read("lib/motion/cinematic/KineticMarquee.tsx");
    expect(marquee).toContain("useReducedMotion");
    const css = read("app/globals.css");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".abx-kinetic-marquee__track");
  });
});
