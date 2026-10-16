// FILE: lib/product/demoProductionParity.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("demo vs production UI separation", () => {
  it("uses a single demo banner gate for demo.abraxasworld.xyz", () => {
    const banner = readFileSync(
      resolve(process.cwd(), "components/judgeDemo/JudgeDemoSandboxBanner.tsx"),
      "utf8",
    );
    expect(banner).toContain("isPublicDemoClientSurface");
    expect(banner).toContain("DEMO environment");
  });

  it("documents live parity baseline for operators", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/product/DEMO_PRODUCTION_VISUAL_PARITY_BASELINE.md"),
      "utf8",
    );
    expect(doc).toContain("demo.abraxasworld.xyz");
    expect(doc).toContain("abraxasworld.xyz");
  });
});
