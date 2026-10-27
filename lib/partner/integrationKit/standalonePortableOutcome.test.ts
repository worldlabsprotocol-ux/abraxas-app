import { describe, expect, it } from "vitest";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";
import { classifyStandalonePortableVerification } from "./standalonePortableOutcome";

function baseVerification(
  overrides: Partial<IndependentVerificationResult>,
): IndependentVerificationResult {
  return {
    contract_version: "abraxas_independent_verifier/1.1.0",
    cryptographically_authentic: true,
    issuer_currently_authorized: true,
    policy_and_audience_match: true,
    status_evidence_authentic: true,
    currently_acceptable: "yes",
    phases: [],
    failure_codes: [],
    disclaimer: "",
    ...overrides,
  };
}

describe("classifyStandalonePortableVerification", () => {
  it("returns indeterminate on fetch errors without treating as deny", () => {
    const r = classifyStandalonePortableVerification({
      fetchErrors: ["portable_verification_fetch_failed", "retry"],
      pinConfigured: false,
    });
    expect(r.action).toBe("indeterminate");
    expect(r.permit_protocol_action).toBe(false);
    expect(r.outcome).toBe("retry");
  });

  it("returns indeterminate when pin is missing", () => {
    const r = classifyStandalonePortableVerification({ pinConfigured: false });
    expect(r.action).toBe("indeterminate");
    expect(r.failure_codes).toContain("integrator_trust_anchor_pin_required");
  });

  it("returns permit when verification is fully acceptable", () => {
    const r = classifyStandalonePortableVerification({
      pinConfigured: true,
      verification: baseVerification({ currently_acceptable: "yes" }),
    });
    expect(r.action).toBe("permit");
    expect(r.permit_protocol_action).toBe(true);
    expect(r.outcome).toBe("permitted");
  });

  it("denies when issuer statement_stale is recorded even if acceptability were yes", () => {
    const r = classifyStandalonePortableVerification({
      pinConfigured: true,
      verification: baseVerification({
        currently_acceptable: "yes",
        failure_codes: ["statement_stale"],
      }),
    });
    expect(r.action).toBe("deny");
    expect(r.permit_protocol_action).toBe(false);
  });

  it("returns deny for authentic expired authorization (not indeterminate)", () => {
    const r = classifyStandalonePortableVerification({
      pinConfigured: true,
      verification: baseVerification({
        currently_acceptable: "no",
        failure_codes: ["not_currently_acceptable"],
      }),
    });
    expect(r.action).toBe("deny");
    expect(r.permit_protocol_action).toBe(false);
    expect(r.cryptographically_authentic).toBe(true);
    expect(r.status_evidence_authentic).toBe(true);
  });

  it("returns indeterminate when trust anchor pin does not match bundle", () => {
    const r = classifyStandalonePortableVerification({
      pinConfigured: true,
      verification: baseVerification({
        cryptographically_authentic: false,
        currently_acceptable: "indeterminate",
        failure_codes: ["anchor_fingerprint_mismatch"],
      }),
    });
    expect(r.action).toBe("indeterminate");
  });
});
