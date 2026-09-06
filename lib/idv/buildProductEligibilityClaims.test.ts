// FILE: lib/idv/buildProductEligibilityClaims.test.ts

import { describe, expect, it } from "vitest";
import { buildProductEligibilityClaimsForIssuance } from "@/lib/idv/buildProductEligibilityClaims";

const EXPIRES = new Date("2027-01-01T00:00:00.000Z");

describe("buildProductEligibilityClaimsForIssuance", () => {
  it("issues only outcome over_21 without DOB in claim_value", () => {
    const claims = buildProductEligibilityClaimsForIssuance({
      subjectId: "0xabc",
      jti: "urn:uuid:test",
      documentDateOfBirth: "1990-01-01",
      minimumAgeGate: 21,
      expiresAt: EXPIRES,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].claim_type).toBe("product_eligibility");
    expect(claims[0].claim_value).toEqual({ outcome: "over_21" });
    expect(JSON.stringify(claims[0])).not.toMatch(/1990|date_of_birth|age/i);
  });

  it("returns no claims when under 21", () => {
    const claims = buildProductEligibilityClaimsForIssuance({
      subjectId: "0xabc",
      jti: "urn:uuid:test",
      documentDateOfBirth: "2010-01-01",
      minimumAgeGate: 21,
      expiresAt: EXPIRES,
    });
    expect(claims).toHaveLength(0);
  });

  it("returns no claims when DOB missing", () => {
    const claims = buildProductEligibilityClaimsForIssuance({
      subjectId: "0xabc",
      jti: "urn:uuid:test",
      minimumAgeGate: 21,
      expiresAt: EXPIRES,
    });
    expect(claims).toHaveLength(0);
  });

  it("issues from authoritative age-band without DOB", () => {
    const claims = buildProductEligibilityClaimsForIssuance({
      subjectId: "0xabc",
      jti: "urn:uuid:test",
      authoritativeAgeBand: "over_21",
      minimumAgeGate: 21,
      expiresAt: EXPIRES,
      evidenceReference: "provider:hash",
    });
    expect(claims).toHaveLength(1);
    expect(claims[0].claim_value).toEqual({ outcome: "over_21" });
  });
});
