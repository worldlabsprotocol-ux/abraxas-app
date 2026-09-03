// FILE: lib/home/assuranceNetworkCopy.test.ts

import { describe, expect, it } from "vitest";
import {
  ASSURANCE_NETWORK_DISCLAIMER,
  ASSURANCE_NETWORK_FORBIDDEN_CLAIMS,
  ASSURANCE_NETWORK_HEADLINE,
} from "./assuranceNetworkCopy";

describe("assurance network homepage copy", () => {
  it("does not include forbidden product claims", () => {
    const corpus = [
      ASSURANCE_NETWORK_HEADLINE,
      ASSURANCE_NETWORK_DISCLAIMER,
    ].join(" ").toLowerCase();

    for (const forbidden of ASSURANCE_NETWORK_FORBIDDEN_CLAIMS) {
      expect(corpus).not.toContain(forbidden);
    }
  });

  it("clarifies zkLogin is authentication not age proof", () => {
    expect(ASSURANCE_NETWORK_DISCLAIMER.toLowerCase()).toContain("authentication");
    expect(ASSURANCE_NETWORK_DISCLAIMER.toLowerCase()).not.toContain("zklogin verifies age");
  });
});
