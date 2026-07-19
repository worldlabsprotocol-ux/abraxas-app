import { describe, expect, it } from "vitest";
import {
  RELYING_PARTY_NORTH_STAR,
  MARKETING_HERO_TAGLINE,
  DOCS_REFRESH_PROMISE,
  BUILDER_PROOF_EXAMPLES,
  PARKED_PUBLIC_NARRATIVES,
} from "./positioningStrategy";

describe("positioningStrategy", () => {
  it("centers relying party adoption as north star", () => {
    expect(RELYING_PARTY_NORTH_STAR.toLowerCase()).toContain("relying party");
  });

  it("keeps marketing tagline simple", () => {
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
});
