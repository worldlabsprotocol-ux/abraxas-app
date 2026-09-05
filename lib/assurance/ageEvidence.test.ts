// FILE: lib/assurance/ageEvidence.test.ts

import { describe, expect, it } from "vitest";
import {
  deriveProviderDecisionFromDob,
  hashProviderReference,
  isAgeEvidenceApprovable,
} from "./ageEvidence";

describe("ageEvidence", () => {
  it("hashes provider references without exposing raw values", () => {
    const hash = hashProviderReference("session-abc");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("session");
  });

  it("derives eligible from valid DOB over 21", () => {
    expect(deriveProviderDecisionFromDob("1990-01-15", 21)).toBe("eligible");
  });

  it("derives ineligible from underage DOB", () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 18);
    const dob = recent.toISOString().slice(0, 10);
    expect(deriveProviderDecisionFromDob(dob, 21)).toBe("ineligible");
  });

  it("derives pending when DOB missing", () => {
    expect(deriveProviderDecisionFromDob(null, 21)).toBe("pending");
    expect(deriveProviderDecisionFromDob("", 21)).toBe("pending");
  });

  it("rejects approval of expired evidence", () => {
    expect(isAgeEvidenceApprovable({
      review_status: "approved",
      provider_decision: "eligible",
      expires_at: "2020-01-01T00:00:00Z",
    })).toBe(false);
  });

  it("allows pending eligible evidence", () => {
    expect(isAgeEvidenceApprovable({
      review_status: "pending",
      provider_decision: "eligible",
      expires_at: null,
    })).toBe(true);
  });
});
