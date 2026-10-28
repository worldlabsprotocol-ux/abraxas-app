// FILE: lib/home/homeTrustArchitectureVisual.test.ts
// Build 884 — one interaction, one visual (not a single static diagram for all stages).

import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage trust architecture visual contract", () => {
  it("switches stage visuals from data and keeps overview separate", () => {
    const source = fs.readFileSync("components/home/HomeTrustContinuousArchitectureImage.tsx", "utf8");
    expect(source).toContain("activeStage.visualSrc");
    expect(source).toContain("TRUST_ARCHITECTURE_OVERVIEW");
    expect(source).not.toMatch(/abraxas-trust-is-continuous-architecture\.png/);
    expect(source).toContain("View full architecture");
  });
});
