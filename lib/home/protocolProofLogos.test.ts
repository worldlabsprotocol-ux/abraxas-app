// FILE: lib/home/protocolProofLogos.test.ts

import { describe, expect, it } from "vitest";
import { PROTOCOL_PROOF_LOGOS, PROTOCOL_PROOF_LOGO_HEIGHT } from "./protocolProofLogos";

describe("PROTOCOL_PROOF_LOGOS", () => {
  it("uses landscape photos for Cielo and Chickasaw", () => {
    expect(PROTOCOL_PROOF_LOGOS.cielo.fit).toBe("cover");
    expect(PROTOCOL_PROOF_LOGOS.chickasaw.fit).toBe("cover");
    expect(PROTOCOL_PROOF_LOGOS.cielo.src).toContain("/assets/cielo/");
    expect(PROTOCOL_PROOF_LOGOS.chickasaw.src).toContain("/assets/cpg/");
  });

  it("uses contain fit for Good Trouble portrait logo", () => {
    expect(PROTOCOL_PROOF_LOGOS["good-trouble"].fit).toBe("contain");
    expect(PROTOCOL_PROOF_LOGOS["good-trouble"].src).toContain("good-trouble");
    expect(PROTOCOL_PROOF_LOGOS["good-trouble"].slotHeight).toBeGreaterThanOrEqual(52);
  });

  it("uses a compact default media strip height", () => {
    expect(PROTOCOL_PROOF_LOGO_HEIGHT).toBe(44);
  });
});
