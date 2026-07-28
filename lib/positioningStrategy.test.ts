import { describe, expect, it } from "vitest";
import {
  RELYING_PARTY_NORTH_STAR,
  ELIGIBILITY_NORTH_STAR,
  MERCHANT_PRODUCT_PITCH,
  DEVELOPER_API_NORTH_STAR,
  MARKETING_HERO_TAGLINE,
  DOCS_REFRESH_PROMISE,
  BUILDER_PROOF_EXAMPLES,
  PARKED_PUBLIC_NARRATIVES,
  WHY_INTEGRATE_ABRAXAS,
  ELIGIBILITY_FLYWHEEL,
  BUILD_VERIFICATION_YOURSELF,
} from "./positioningStrategy";

describe("positioningStrategy", () => {
  it("centers relying party adoption as north star", () => {
    expect(RELYING_PARTY_NORTH_STAR.toLowerCase()).toContain("relying party");
  });

  it("sells never build verification again to merchants", () => {
    expect(MERCHANT_PRODUCT_PITCH.toLowerCase()).toContain("never build verification");
  });

  it("asks whether work was already verified", () => {
    expect(ELIGIBILITY_NORTH_STAR.toLowerCase()).toContain("already been verified");
  });

  it("centers the API as the product", () => {
    expect(DEVELOPER_API_NORTH_STAR).toContain("abraxas.can");
  });

  it("keeps marketing tagline as mechanism on homepage", () => {
    expect(MARKETING_HERO_TAGLINE.toLowerCase()).toContain("verify once");
  });

  it("puts refresh nuance in docs promise not hero", () => {
    expect(DOCS_REFRESH_PROMISE.toLowerCase()).toContain("refresh");
  });

  it("lists real builder proof examples", () => {
    expect(BUILDER_PROOF_EXAMPLES.some(e => e.name.includes("Cielo"))).toBe(true);
    expect(BUILDER_PROOF_EXAMPLES.length).toBe(2);
  });

  it("parks premature orchestration rebrand", () => {
    expect(PARKED_PUBLIC_NARRATIVES.some(n => n.includes("Orchestration"))).toBe(true);
  });

  it("documents five integration reasons including network effects", () => {
    expect(WHY_INTEGRATE_ABRAXAS).toHaveLength(5);
    expect(WHY_INTEGRATE_ABRAXAS[4]?.toLowerCase()).toContain("network");
  });

  it("defines the eligibility flywheel", () => {
    expect(ELIGIBILITY_FLYWHEEL[0]?.toLowerCase()).toContain("verifies once");
    expect(ELIGIBILITY_FLYWHEEL.at(-1)?.toLowerCase()).toContain("verify once");
    expect(BUILD_VERIFICATION_YOURSELF.length).toBeGreaterThanOrEqual(8);
  });
});
