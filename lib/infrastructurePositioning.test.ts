import { describe, expect, it } from "vitest";
import {
  ABRAXAS_INFRA_HEADLINE,
  BUILD_WITH_CAPABILITIES,
  INTEGRATE_CAPABILITIES,
  NETWORK_EFFECT_STEPS,
  RWA_STACK_LAYERS,
} from "./infrastructurePositioning";

describe("infrastructurePositioning", () => {
  it("defines stack with Abraxas as infrastructure layer", () => {
    const abx = RWA_STACK_LAYERS.find(l => l.id === "abraxas");
    expect(abx?.highlight).toBe(true);
    expect(RWA_STACK_LAYERS).toHaveLength(3);
  });

  it("defines four-step network effect", () => {
    expect(NETWORK_EFFECT_STEPS).toHaveLength(4);
  });

  it("uses primary tagline as infra headline", () => {
    expect(ABRAXAS_INFRA_HEADLINE.toLowerCase()).toContain("verify once");
  });

  it("lists build-with capabilities for developer section", () => {
    expect(BUILD_WITH_CAPABILITIES).toContain("Passport SDK");
    expect(BUILD_WITH_CAPABILITIES.length).toBe(6);
  });

  it("lists integrate capabilities for builder section", () => {
    expect(INTEGRATE_CAPABILITIES.length).toBeGreaterThanOrEqual(5);
  });
});
