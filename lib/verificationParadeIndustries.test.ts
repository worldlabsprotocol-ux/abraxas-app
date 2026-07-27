import { describe, expect, it } from "vitest";
import { VERIFICATION_PARADE_INDUSTRIES, VERIFICATION_PARADE_LABELS } from "./verificationParadeIndustries";

describe("verificationParadeIndustries", () => {
  it("lists regulated verticals for the demo parade", () => {
    expect(VERIFICATION_PARADE_LABELS).toContain("Cannabis");
    expect(VERIFICATION_PARADE_LABELS).toContain("Spirits");
    expect(VERIFICATION_PARADE_LABELS).toContain("Exchange");
    expect(VERIFICATION_PARADE_INDUSTRIES.every(i => i.gate.length > 0)).toBe(true);
  });
});
