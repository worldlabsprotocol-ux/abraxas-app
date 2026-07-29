// FILE: lib/home/protocolProofLogos.test.ts

import { describe, expect, it } from "vitest";
import { PROTOCOL_PROOF_LOGOS, PROTOCOL_PROOF_LOGO_HEIGHT } from "./protocolProofLogos";

describe("PROTOCOL_PROOF_LOGOS", () => {
  it("defines logos for all protocol proof partners", () => {
    expect(PROTOCOL_PROOF_LOGOS.cielo.src).toBe("/assets/cielo/logo-mark.svg");
    expect(PROTOCOL_PROOF_LOGOS.chickasaw.src).toBe("/assets/cpg/logo-mark.svg");
    expect(PROTOCOL_PROOF_LOGOS["good-trouble"].src).toContain("good-trouble");
    expect(PROTOCOL_PROOF_LOGOS.passport.src).toBe("/icon-48.png");
  });

  it("uses a compact uniform logo height", () => {
    expect(PROTOCOL_PROOF_LOGO_HEIGHT).toBe(36);
  });
});
