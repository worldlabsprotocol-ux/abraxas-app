// FILE: lib/home/protocolProofMedia.test.ts

import { describe, expect, it } from "vitest";
import { PROTOCOL_PROOF_IMAGES } from "./protocolProofMedia";

describe("protocolProofMedia", () => {
  it("maps canonical audited paths for live proofs", () => {
    expect(PROTOCOL_PROOF_IMAGES.cielo.src).toBe("/assets/cielo/registry-card-exterior.jpg");
    expect(PROTOCOL_PROOF_IMAGES.chickasaw.src).toBe("/assets/cpg/hero-oklahoma-land.jpg");
    expect(PROTOCOL_PROOF_IMAGES["good-trouble"].src).toBe("/assets/good-trouble/brand-logo.png");
  });
});
