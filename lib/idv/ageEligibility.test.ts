// FILE: lib/idv/ageEligibility.test.ts

import { describe, expect, it } from "vitest";
import {
  evaluateAgeEligibilityFromDateOfBirth,
  evaluateAgeEligibilityFromDocumentDate,
  parseAuthoritativeDateOfBirth,
  PRODUCT_ELIGIBILITY_OVER_21,
} from "@/lib/idv/ageEligibility";

const AS_OF = new Date("2026-06-01T12:00:00.000Z");

describe("parseAuthoritativeDateOfBirth", () => {
  it("accepts valid YYYY-MM-DD", () => {
    const dob = parseAuthoritativeDateOfBirth("1990-05-15");
    expect(dob).not.toBeNull();
    expect(dob?.toISOString().slice(0, 10)).toBe("1990-05-15");
  });

  it("rejects malformed dates", () => {
    expect(parseAuthoritativeDateOfBirth("05-15-1990")).toBeNull();
    expect(parseAuthoritativeDateOfBirth("1990-13-01")).toBeNull();
    expect(parseAuthoritativeDateOfBirth("not-a-date")).toBeNull();
  });

  it("rejects future dates", () => {
    expect(parseAuthoritativeDateOfBirth("2099-01-01")).toBeNull();
  });
});

describe("evaluateAgeEligibilityFromDocumentDate", () => {
  it("approves age 21+ evidence", () => {
    const result = evaluateAgeEligibilityFromDocumentDate("1990-01-01", 21, AS_OF);
    expect(result.eligible).toBe(true);
    expect(result.failureReason).toBeUndefined();
  });

  it("denies under 21", () => {
    const result = evaluateAgeEligibilityFromDocumentDate("2010-06-01", 21, AS_OF);
    expect(result.eligible).toBe(false);
    expect(result.failureReason).toBe("under_minimum");
  });

  it("denies missing DOB", () => {
    expect(evaluateAgeEligibilityFromDocumentDate(null, 21, AS_OF).eligible).toBe(false);
    expect(evaluateAgeEligibilityFromDocumentDate("", 21, AS_OF).failureReason).toBe("missing");
  });

  it("denies malformed DOB", () => {
    expect(evaluateAgeEligibilityFromDocumentDate("bad", 21, AS_OF).failureReason).toBe("invalid");
  });

  it("denies future DOB", () => {
    expect(evaluateAgeEligibilityFromDocumentDate("2099-01-01", 21, AS_OF).failureReason).toBe("future");
  });

  it("never returns DOB or age in the result object", () => {
    const result = evaluateAgeEligibilityFromDocumentDate("1990-01-01", 21, AS_OF);
    expect(JSON.stringify(result)).not.toMatch(/1990|date_of_birth|age/i);
    expect(PRODUCT_ELIGIBILITY_OVER_21).toBe("over_21");
  });
});

describe("evaluateAgeEligibilityFromDateOfBirth", () => {
  it("denies exactly one day before 21st birthday", () => {
    const dob = parseAuthoritativeDateOfBirth("2005-06-02");
    expect(dob).not.toBeNull();
    const result = evaluateAgeEligibilityFromDateOfBirth(dob!, 21, AS_OF);
    expect(result.eligible).toBe(false);
  });

  it("approves on 21st birthday", () => {
    const dob = parseAuthoritativeDateOfBirth("2005-06-01");
    expect(dob).not.toBeNull();
    const result = evaluateAgeEligibilityFromDateOfBirth(dob!, 21, AS_OF);
    expect(result.eligible).toBe(true);
  });
});
