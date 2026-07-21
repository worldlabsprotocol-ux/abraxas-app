// FILE: lib/authenticationProof/policyVersion.test.ts

import { describe, expect, it } from "vitest";
import { parsePolicyVersionNumber } from "./policyVersion";

describe("parsePolicyVersionNumber", () => {
  it("parses dated policy version strings", () => {
    expect(parsePolicyVersionNumber("2026-07-08")).toBe(20260708);
  });
});
