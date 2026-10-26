import { describe, expect, it } from "vitest";
import { assertNoUnsafePermit, deriveCurrentValidityDecision } from "./unifiedContract";

const base = {
  cryptographically_valid: true,
  issuer_authorized: true,
  issued_approved: true,
  policy_and_audience_match: true,
  partner_operational: true,
  policy_active: true,
  claims_current: true,
  evidence_current: true,
  receipt_status_active: true,
  not_expired: true,
  not_superseded: true,
  store_available: true,
};

describe("deriveCurrentValidityDecision", () => {
  it("permits only when all gates pass", () => {
    const d = deriveCurrentValidityDecision(base);
    expect(d.currently_acceptable).toBe(true);
    expect(d.lifecycle_status).toBe("active");
    assertNoUnsafePermit({
      currently_acceptable: d.currently_acceptable,
      invalidation_reasons: d.hard_deny_reasons,
      lifecycle_status: d.lifecycle_status,
    });
  });

  it("fails closed on store unavailable", () => {
    const d = deriveCurrentValidityDecision(
      { ...base, store_available: false },
      ["validity_store_unavailable"],
    );
    expect(d.currently_acceptable).toBe(false);
  });

  it("never permits when revoked", () => {
    const d = deriveCurrentValidityDecision(base, ["receipt_revoked"]);
    expect(d.currently_acceptable).toBe(false);
    expect(d.lifecycle_status).toBe("revoked");
  });
});
