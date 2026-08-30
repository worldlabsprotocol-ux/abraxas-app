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

  it("handles leap-day DOB boundary (Feb 29)", () => {
    // Policy note: March 1 eligibility for Feb 29 births is an operating-jurisdiction
    // decision Good Trouble must confirm before treating Abraxas as a legal cannabis gate.
    const leapDob = parseAuthoritativeDateOfBirth("2004-02-29");
    expect(leapDob).not.toBeNull();

    const dayBefore21 = evaluateAgeEligibilityFromDateOfBirth(
      leapDob!,
      21,
      new Date("2025-02-28T12:00:00.000Z"),
    );
    expect(dayBefore21.eligible).toBe(false);
    expect(dayBefore21.failureReason).toBe("under_minimum");

    const on21stBirthday = evaluateAgeEligibilityFromDateOfBirth(
      leapDob!,
      21,
      new Date("2025-03-01T12:00:00.000Z"),
    );
    expect(on21stBirthday.eligible).toBe(true);
  });
});

describe("evaluateAgeEligibilityFromDocumentDate timezone matrix", () => {
  const dob = "1990-06-15";
  const minimumAge = 21;

  const asOfInstants = [
    new Date("2011-06-15T00:00:00.000Z"),
    new Date("2011-06-15T08:00:00-08:00"),
    new Date("2011-06-14T16:00:00-08:00"),
    new Date("2011-06-15T23:59:59.999Z"),
  ];

  it("produces identical eligibility for the same UTC calendar day", () => {
    const results = asOfInstants.map((asOf) =>
      evaluateAgeEligibilityFromDocumentDate(dob, minimumAge, asOf),
    );
    for (const result of results) {
      expect(result.eligible).toBe(true);
      expect(result.failureReason).toBeUndefined();
    }
  });

  it("denies one UTC day before 21st birthday across offset representations", () => {
    const underInstants = [
      new Date("2011-06-14T23:59:59.999Z"),
      new Date("2011-06-14T15:59:59.999-08:00"),
    ];
    for (const asOf of underInstants) {
      const result = evaluateAgeEligibilityFromDocumentDate(dob, minimumAge, asOf);
      expect(result.eligible).toBe(false);
      expect(result.failureReason).toBe("under_minimum");
    }
  });
});
