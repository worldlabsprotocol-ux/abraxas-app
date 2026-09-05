// FILE: lib/idv/adminReviewApproveValidation.test.ts
// Validation rules for admin age-eligibility approval — no DB required.

import { describe, expect, it } from "vitest";
import { parseAuthoritativeDateOfBirth } from "./ageEligibility";
import { evaluateAgeEligibilityFromDocumentDate } from "./ageEligibility";
import { deriveProviderDecisionFromDob } from "@/lib/assurance/ageEvidence";

describe("adminReviewApproveValidation", () => {
  it("rejects missing DOB for age gate 21", () => {
    const result = evaluateAgeEligibilityFromDocumentDate(null, 21);
    expect(result.eligible).toBe(false);
    expect(deriveProviderDecisionFromDob(null, 21)).toBe("pending");
  });

  it("rejects invalid DOB format", () => {
    expect(parseAuthoritativeDateOfBirth("01-15-1990")).toBeNull();
    expect(parseAuthoritativeDateOfBirth("1990/01/15")).toBeNull();
  });

  it("accepts valid DOB for over-21 gate", () => {
    const result = evaluateAgeEligibilityFromDocumentDate("1990-06-15", 21);
    expect(result.eligible).toBe(true);
    expect(deriveProviderDecisionFromDob("1990-06-15", 21)).toBe("eligible");
  });

  it("denial path: underage DOB cannot produce eligible decision", () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 19);
    const dob = recent.toISOString().slice(0, 10);
    expect(evaluateAgeEligibilityFromDocumentDate(dob, 21).eligible).toBe(false);
    expect(deriveProviderDecisionFromDob(dob, 21)).toBe("ineligible");
  });
});
