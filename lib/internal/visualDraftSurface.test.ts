import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

describe("internal visual draft surface", () => {
  it("exposes minimal internal page and draft artwork", () => {
    expect(existsSync(resolve(ROOT, "app/internal/visual-draft/page.tsx"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/brand/draft/abraxas-living-sphere-concept.jpg"))).toBe(true);
    expect(existsSync(resolve(ROOT, "public/brand/draft/abraxas-protocol-operator-concept.jpg"))).toBe(true);
    const redirect = readFileSync(resolve(ROOT, "app/founder-brand-review/page.tsx"), "utf8");
    expect(redirect).toContain("/internal/visual-draft");
  });

  it("keeps ASM assessment in private docs only", () => {
    expect(existsSync(resolve(ROOT, "docs/internal/asm-technical-assessment.md"))).toBe(true);
    expect(existsSync(resolve(ROOT, "app/docs/founder/asm-agent-authorization-research/page.tsx"))).toBe(false);
  });
});
