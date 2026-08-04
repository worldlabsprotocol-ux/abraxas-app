import { describe, expect, it } from "vitest";
import {
  abraxasCaptureApprovedClaims,
  manualApprovedClaims,
  residencyCountryClaim,
  veriffApprovedClaims,
} from "./claimSchema";

const EXPIRES = new Date("2027-01-01T00:00:00Z");
const BASE = {
  subjectId: "0xabc",
  jti: "urn:uuid:test",
  jurisdiction: "US-MO",
  documentType: "drivers_license",
  expiresAt: EXPIRES,
};

describe("residencyCountryClaim", () => {
  it("derives country and state from combined jurisdiction", () => {
    const claim = residencyCountryClaim({
      ...BASE,
      evidenceReference: "test:1",
    });
    expect(claim.claim_type).toBe("residency_country");
    expect(claim.claim_value).toEqual({ country: "US", state: "MO" });
    expect(claim.jurisdiction).toBe("US-MO");
    expect(claim.assurance_level).toBe("L2");
  });

  it("derives country-only jurisdiction", () => {
    const claim = residencyCountryClaim({
      ...BASE,
      jurisdiction: "CA",
      evidenceReference: "test:2",
    });
    expect(claim.claim_value).toEqual({ country: "CA" });
    expect(claim.jurisdiction).toBe("CA");
  });
});

describe("IDV issuance paths include residency_country", () => {
  it("abraxasCaptureApprovedClaims issues residency_country", () => {
    const claims = abraxasCaptureApprovedClaims({
      ...BASE,
      captureSessionId: "cap-1",
    });
    const residency = claims.find(c => c.claim_type === "residency_country");
    expect(residency?.claim_value).toEqual({ country: "US", state: "MO" });
  });

  it("manualApprovedClaims issues residency_country", () => {
    const claims = manualApprovedClaims({
      ...BASE,
      reviewId: "rev-1",
    });
    expect(claims.some(c => c.claim_type === "residency_country")).toBe(true);
  });

  it("veriffApprovedClaims issues residency_country", () => {
    const claims = veriffApprovedClaims({
      ...BASE,
      veriffSessionId: "veriff-1",
    });
    expect(claims.some(c => c.claim_type === "residency_country")).toBe(true);
  });
});
