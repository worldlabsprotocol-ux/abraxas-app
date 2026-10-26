// FILE: lib/home/homepageSimplification.test.ts

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  CINEMATIC_HOME_CTA_PRIMARY,
  CINEMATIC_HOME_CTA_PRIMARY_HREF,
  CINEMATIC_HOME_LEAD,
} from "./cinematicHomeCopy";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("homepage simplification (#homepage-refinement)", () => {
  it("hero keeps one primary CTA to sandbox", () => {
    const hero = read("components/home/premium/PremiumHomeHero.tsx");
    expect(hero).toContain("CINEMATIC_HOME_CTA_PRIMARY");
    expect(hero).not.toContain("CINEMATIC_HOME_CTA_SECONDARY");
    expect(CINEMATIC_HOME_CTA_PRIMARY).toBe("Start building");
    expect(CINEMATIC_HOME_CTA_PRIMARY_HREF).toBe("#start-sandbox");
  });

  it("uses one supporting hero line aligned with protocol lead", () => {
    expect(CINEMATIC_HOME_LEAD).toContain("signed trust decisions");
    expect(CINEMATIC_HOME_LEAD).not.toContain("without exposing");
    const hero = read("components/home/premium/PremiumHomeHero.tsx");
    expect(hero).not.toContain("CINEMATIC_HOME_PRIVACY_SUPPORT");
  });

  it("replaces protocol text box with diagram beneath marquee", () => {
    const section = read("components/home/HomeProtocolInfrastructureSection.tsx");
    expect(section).toContain("HomeAbraxasProtocolDiagram");
    expect(section).not.toContain("PROTOCOL_PUBLIC_PILLARS");
    expect(section).not.toContain("Trust you can verify");
    read("components/home/HomeAbraxasProtocolDiagram.tsx");
    read("public/home/abraxas-protocol-architecture.png");
  });

  it("places protocol marquee between hero and spine content", () => {
    const shell = read("components/redesign/RedesignHome.tsx");
    expect(shell).toContain("HomeProtocolSignalMarquee");
    const body = shell.slice(shell.indexOf("function HomeContent"));
    const heroIndex = body.indexOf("{hero}");
    const marqueeIndex = body.indexOf("<HomeProtocolSignalMarquee");
    const spineIndex = body.indexOf("<HomeProtocolInfrastructureSection");
    expect(marqueeIndex).toBeGreaterThan(heroIndex);
    expect(spineIndex).toBeGreaterThan(marqueeIndex);
  });

  it("unified entry removes four tab panels before sandbox", () => {
    const unified = read("components/home/HomeUnifiedProductEntry.tsx");
    expect(unified).not.toContain("abx-home-unified-entry__nav");
    expect(unified).toContain("HomeNativeSandboxChapter");
    expect(unified).not.toContain("HomeHowAbraxasWorksSection");
  });

  it("canonical architecture reference exists", () => {
    read("docs/product/HOMEPAGE_CANONICAL_ARCHITECTURE.md");
    read("components/home/HomeAbraxasSystemArchitectureDiagram.tsx");
  });
});
