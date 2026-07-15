// FILE: lib/cpgLandCaseStudy.test.ts

import { describe, expect, it } from "vitest";
import { CPG_ASSET, CPG_PRICING, CPG_REGISTRY_VALUE_USD, formatUsd } from "./cpgLandCaseStudy";

describe("cpgLandCaseStudy pricing", () => {
  it("uses public Chickasaw Project name", () => {
    expect(CPG_ASSET.name).toBe("Chickasaw Project");
    expect(CPG_ASSET.legacyName).toBe("Grady County 270");
  });

  it("uses partner list price for registry roll-up", () => {
    expect(CPG_REGISTRY_VALUE_USD).toBe(CPG_PRICING.fullProject);
    expect(CPG_REGISTRY_VALUE_USD).toBe(1_639_000);
  });

  it("formats USD without cents", () => {
    expect(formatUsd(1_639_000)).toBe("$1,639,000");
  });
});
