// FILE: lib/home/homepageBaseline.test.ts
// Static guards — approved homepage baseline must not regress without explicit redesign PR.

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing protected file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("homepage baseline (approved design invariants)", () => {
  it("Protocol in Action renders partner media marks", () => {
    const src = read("components/home/HomeProtocolInAction.tsx");
    expect(src).toContain("PROTOCOL_PROOF_LOGOS");
    expect(src).toContain("ProofMediaMark");
    expect(src).toContain("abx-home-proof-grid");
    expect(src).toContain("abx-home-section-center");
  });

  it("hero uses centered layout classes", () => {
    const hero = read("components/home/HomeSharpHero.tsx");
    expect(hero).toContain("abx-home-hero");
    expect(hero).toContain("abx-home-hero-actions");

    const shell = read("components/redesign/RedesignHome.tsx");
    expect(shell).toContain('textAlign: "center"');
    expect(shell).toContain('alignItems: "center"');
  });

  it("homepage typography CSS tokens exist", () => {
    const css = read("app/globals.css");
    expect(css).toContain(".abx-home-section-center");
    expect(css).toContain(".abx-home-proof-card");
    expect(css).toContain(".abx-home-proof-media");
  });

  it("protocol proof asset modules are present", () => {
    read("lib/home/protocolProofLogos.ts");
    read("lib/home/protocolProofMedia.ts");
    const logos = read("lib/home/protocolProofLogos.ts");
    expect(logos).toContain("cielo");
    expect(logos).toContain("chickasaw");
    expect(logos).toContain("good-trouble");
  });
});
