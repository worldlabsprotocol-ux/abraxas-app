// FILE: lib/cpgLandCaseStudy.test.ts

import { describe, expect, it } from "vitest";
import {
  CPG_REGISTRY_MARKUP_RATE,
  CPG_REGISTRY_VALUE,
  CPG_PRICING,
  abraxasRegistryReference,
} from "./cpgLandCaseStudy";

describe("cpgLandCaseStudy pricing", () => {
  it("applies 20% registry markup within 10-40% band", () => {
    expect(CPG_REGISTRY_MARKUP_RATE).toBeGreaterThanOrEqual(0.1);
    expect(CPG_REGISTRY_MARKUP_RATE).toBeLessThanOrEqual(0.4);
    expect(abraxasRegistryReference(1_000_000)).toBe(1_200_000);
  });

  it("computes full project registry reference from seller ask", () => {
    expect(CPG_REGISTRY_VALUE.fullProjectReference).toBe(
      abraxasRegistryReference(CPG_PRICING.fullProjectSellerAsk),
    );
  });
});
