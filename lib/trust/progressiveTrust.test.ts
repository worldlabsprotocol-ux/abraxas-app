import { describe, expect, it } from "vitest";
import { meetsTrustLevel, requiredLevelForSurface } from "./progressiveTrust";

describe("progressive trust levels", () => {
  it("maps surfaces to levels without implying identity scores", () => {
    expect(requiredLevelForSurface("public_explore")).toBe(0);
    expect(requiredLevelForSurface("sandbox_enroll")).toBe(1);
    expect(requiredLevelForSurface("private_application")).toBe(2);
    expect(requiredLevelForSurface("identity_evidence")).toBe(3);
    expect(requiredLevelForSurface("production_activation")).toBe(4);
  });

  it("does not treat level 3 verification as level 4 privilege", () => {
    expect(meetsTrustLevel(3, 4)).toBe(false);
    expect(meetsTrustLevel(3, 3)).toBe(true);
  });
});
