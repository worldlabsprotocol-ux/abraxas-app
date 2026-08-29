// FILE: lib/home/publicDemoReadinessCopy.test.ts
// Regression guards — public homepage must not expose internal engineering or release checklists.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOME_BETA_READINESS_DISCLAIMER,
  HOME_BETA_READINESS_POINTS,
} from "@/lib/activation/activationCopy";

const ROOT = resolve(__dirname, "../..");

const PUBLIC_HOME_FORBIDDEN_INTERNAL_PHRASES = [
  "Execute the Institutional Acceptance Test against production",
  "Freeze the public contract",
  "PROTOCOL_COMPATIBILITY.md",
  "Tag v1.0.0-beta.0",
  "P1 integrity hardening",
  "What we are shipping now",
] as const;

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing protected file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

const PUBLIC_HOME_SURFACE_FILES = [
  "components/home/HomeRoadmapBrief.tsx",
  "components/redesign/RedesignHome.tsx",
  "components/home/HomeSharpHero.tsx",
  "components/home/HomePolicyOutcomeStrip.tsx",
  "components/home/HomeAudienceFork.tsx",
  "lib/activation/activationCopy.ts",
] as const;

const FORBIDDEN_PATTERN_TESTS: Array<{ label: string; pattern: RegExp }> = [
  { label: "execute against production", pattern: /execute[\s\S]{0,40}against production/i },
  { label: "freeze the public contract", pattern: /freeze the public contract/i },
  { label: "protocol compatibility doc", pattern: /protocol_compatibility/i },
  { label: "version tag roadmap", pattern: /tag v1\.0\.0-beta/i },
  { label: "p1 integrity hardening", pattern: /p1 integrity hardening|pi-hardening/i },
  { label: "internal shipping headline", pattern: /what we are shipping now/i },
  { label: "institutional acceptance test", pattern: /institutional acceptance test/i },
];

describe("public demo readiness homepage copy", () => {
  it("defines three factual beta overview points and a no-claims disclaimer", () => {
    expect(HOME_BETA_READINESS_POINTS).toHaveLength(3);
    expect(HOME_BETA_READINESS_POINTS[0]?.toLowerCase()).toContain("verification once");
    expect(HOME_BETA_READINESS_POINTS[1]?.toLowerCase()).toContain("signed receipt");
    expect(HOME_BETA_READINESS_POINTS[2]?.toLowerCase()).toContain("manual review");
    expect(HOME_BETA_READINESS_DISCLAIMER.toLowerCase()).toContain("does not certify");
    expect(HOME_BETA_READINESS_DISCLAIMER.toLowerCase()).not.toContain("sla guarantee");
  });

  it("documents forbidden internal phrases for operator review", () => {
    expect(PUBLIC_HOME_FORBIDDEN_INTERNAL_PHRASES.length).toBeGreaterThanOrEqual(5);
  });

  for (const rel of PUBLIC_HOME_SURFACE_FILES) {
    it(`does not expose internal runbook wording in ${rel}`, () => {
      const src = read(rel);
      for (const phrase of PUBLIC_HOME_FORBIDDEN_INTERNAL_PHRASES) {
        expect(src, `found forbidden phrase "${phrase}"`).not.toContain(phrase);
      }
      for (const { label, pattern } of FORBIDDEN_PATTERN_TESTS) {
        expect(src, `matched forbidden pattern: ${label}`).not.toMatch(pattern);
      }
    });
  }

  it("HomeRoadmapBrief sources customer-facing beta copy from activationCopy", () => {
    const brief = read("components/home/HomeRoadmapBrief.tsx");
    expect(brief).toContain("HOME_BETA_READINESS_POINTS");
    expect(brief).toContain("HOME_BETA_READINESS_DISCLAIMER");
    expect(brief).not.toContain("CURRENT_FOCUS");
    expect(brief).not.toContain('href="/roadmap"');
    expect(brief).toContain('id="how-it-works"');
  });

  it("positioningStrategy no longer ships internal CURRENT_FOCUS checklist on the homepage path", () => {
    const strategy = read("lib/positioningStrategy.ts");
    expect(strategy).not.toContain("CURRENT_FOCUS");
    expect(strategy).not.toMatch(/execute[\s\S]{0,40}against production/i);
  });
});
