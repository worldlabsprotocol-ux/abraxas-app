// FILE: lib/home/trustArchitectureStages.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectTrustArchitecturePublicCopy,
  TRUST_ARCHITECTURE_STAGES,
} from "./trustArchitectureStages";

const DASH_PATTERN = /[-–—]/;

describe("trust architecture stages", () => {
  it("defines four numbered stages with short plain captions", () => {
    expect(TRUST_ARCHITECTURE_STAGES).toHaveLength(4);
    expect(TRUST_ARCHITECTURE_STAGES.map((s) => s.index)).toEqual(["01", "02", "03", "04"]);
    expect(TRUST_ARCHITECTURE_STAGES[1]?.title).toMatch(/Abraxas decision/i);
    expect(TRUST_ARCHITECTURE_STAGES.every((s) => s.caption.length > 8 && s.caption.length < 120)).toBe(true);
    expect(TRUST_ARCHITECTURE_STAGES[0]?.caption).toMatch(/request is made/i);
  });

  it("maps each stage to a distinct public visual asset", () => {
    const root = path.join(process.cwd(), "public");
    const srcs = TRUST_ARCHITECTURE_STAGES.map((s) => s.visualSrc);
    expect(new Set(srcs).size).toBe(4);
    for (const src of srcs) {
      expect(fs.existsSync(path.join(root, src.replace(/^\//, "")))).toBe(true);
    }
  });

  it("uses no dashes in public architecture copy", () => {
    const component = fs.readFileSync("components/home/HomeTrustContinuousArchitectureImage.tsx", "utf8");
    const carousel = fs.readFileSync("components/home/premium/PremiumHomeHeroCarousel.tsx", "utf8");
    const visibleStrings = [
      ...component.matchAll(/>([^<{]+)</g),
      ...carousel.matchAll(/diagram-scroll-hint[^>]*>([^<]+)</g),
    ]
      .map((m) => m[1]?.trim() ?? "")
      .filter((s) => s.length > 2);
    for (const text of [...visibleStrings, ...collectTrustArchitecturePublicCopy()]) {
      expect(text).not.toMatch(DASH_PATTERN);
    }
  });
});
