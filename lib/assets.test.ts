// FILE: lib/assets.test.ts
import { describe, expect, it } from "vitest";
import { CIELO_SUNRISE, CHICKASAW_PROJECT, LIVE_PROOF_ASSETS } from "./assets";

describe("lib/assets", () => {
  it("uses dome hero for Cielo", () => {
    expect(CIELO_SUNRISE.image.src).toContain("/assets/cielo/04.jpg");
    expect(CIELO_SUNRISE.abxId).toBe("ABX-RE-HOSP-001");
  });

  it("uses Oklahoma land hero for Chickasaw", () => {
    expect(CHICKASAW_PROJECT.image.src).toContain("/assets/cpg/hero-oklahoma-land.jpg");
    expect(CHICKASAW_PROJECT.abxId).toBe("ABX-RE-LAND-006");
  });

  it("exposes exactly two live proof assets", () => {
    expect(LIVE_PROOF_ASSETS).toHaveLength(2);
  });
});
