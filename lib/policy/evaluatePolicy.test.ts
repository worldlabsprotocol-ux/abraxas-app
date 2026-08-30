// FILE: lib/policy/evaluatePolicy.test.ts
import { describe, it, expect } from "vitest";
import { evaluatePolicyRules, expandRequiredClaimsForMinimumAge } from "@/lib/policy/evaluatePolicy";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { productEligibilityClaim } from "@/lib/credentials/claimSchema";

function claim(partial: Partial<CredentialClaimRecord> & Pick<CredentialClaimRecord, "claim_type">): CredentialClaimRecord {
  return {
    id: "1",
    subject_id: "0x1",
    credential_jti: null,
    claim_value: {},
    issuer_id: "issuer:test",
    assurance_level: "L2",
    issued_at: new Date().toISOString(),
    expires_at: null,
    status: "active",
    revocation_reference: null,
    evidence_reference: null,
    jurisdiction: null,
    policy_scope: null,
    ...partial,
  };
}

describe("evaluatePolicyRules", () => {
  const bookingPolicy: PartnerPolicyRules = {
    required_claims: [
      { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
      { claim_type: "liveness_passed", max_age_hours: 8760 },
      { claim_type: "wallet_binding_confirmed", max_age_hours: 8760 },
    ],
  };

  it("approves when all required claims present", () => {
    const claims = [
      claim({ claim_type: "identity_verified" }),
      claim({ claim_type: "liveness_passed" }),
      claim({ claim_type: "wallet_binding_confirmed" }),
    ];
    const result = evaluatePolicyRules(bookingPolicy, claims);
    expect(result.decision).toBe("approved");
    expect(result.missing_claims).toHaveLength(0);
  });

  it("denies when identity claim missing", () => {
    const result = evaluatePolicyRules(bookingPolicy, [
      claim({ claim_type: "wallet_binding_confirmed" }),
    ]);
    expect(result.decision).toBe("denied");
    expect(result.missing_claims).toContain("identity_verified");
  });

  it("manual_review when only screening missing on RWA policy", () => {
    const rwaPolicy: PartnerPolicyRules = {
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "screening_outcome", max_age_hours: 24, must_equal: "clear" },
      ],
    };
    const result = evaluatePolicyRules(rwaPolicy, [
      claim({ claim_type: "identity_verified" }),
      claim({ claim_type: "screening_outcome", claim_value: { outcome: "pending_partner_screen" } }),
    ]);
    expect(result.decision).toBe("manual_review");
  });

  it("rejects sandbox screening claims on production policies", () => {
    const prodPolicy: PartnerPolicyRules = {
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "screening_outcome", max_age_hours: 24, must_equal: "clear" },
      ],
    };
    const result = evaluatePolicyRules(prodPolicy, [
      claim({ claim_type: "identity_verified" }),
      claim({
        claim_type: "screening_outcome",
        issuer_id: "issuer:abraxas-sandbox",
        claim_value: {
          outcome: "clear",
          environment: "sandbox",
          status: "demo",
          non_reliance: true,
        },
      }),
    ]);
    expect(result.decision).not.toBe("approved");
    expect(result.missing_claims).toContain("screening_outcome");
    expect(result.production_usable).toBe(false);
  });

  it("sandbox policy approves with sandbox screening and returns sandbox_only context", () => {
    const sandboxPolicy: PartnerPolicyRules = {
      sandbox_only: true,
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "screening_outcome", max_age_hours: 24, must_equal: "clear" },
      ],
    };
    const result = evaluatePolicyRules(sandboxPolicy, [
      claim({ claim_type: "identity_verified" }),
      claim({
        claim_type: "screening_outcome",
        issuer_id: "issuer:abraxas-sandbox",
        claim_value: {
          outcome: "clear",
          environment: "sandbox",
          status: "demo",
          non_reliance: true,
        },
      }),
    ]);
    expect(result.decision).toBe("approved");
    expect(result.decision_context).toBe("sandbox_only");
    expect(result.production_usable).toBe(false);
  });

  it("Good Trouble retail approves when residency_country and all claims present", () => {
    const gtPolicy: PartnerPolicyRules = {
      sandbox_only: true,
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "liveness_passed", max_age_hours: 8760 },
        { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
        { claim_type: "residency_country", max_age_hours: 8760 },
      ],
    };
    const result = evaluatePolicyRules(gtPolicy, [
      claim({ claim_type: "identity_verified", jurisdiction: "US-MO" }),
      claim({ claim_type: "liveness_passed" }),
      claim({ claim_type: "wallet_binding_confirmed" }),
      claim({
        claim_type: "residency_country",
        claim_value: { country: "US", state: "MO" },
        jurisdiction: "US-MO",
      }),
    ]);
    expect(result.decision).toBe("approved");
    expect(result.missing_claims).toHaveLength(0);
  });

  it("Good Trouble retail denies without residency_country", () => {
    const gtPolicy: PartnerPolicyRules = {
      sandbox_only: true,
      minimum_age: 21,
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "liveness_passed", max_age_hours: 8760 },
        { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
        { claim_type: "residency_country", max_age_hours: 8760 },
      ],
    };
    const result = evaluatePolicyRules(gtPolicy, [
      claim({ claim_type: "identity_verified" }),
      claim({ claim_type: "liveness_passed" }),
      claim({ claim_type: "wallet_binding_confirmed" }),
    ]);
    expect(result.decision).toBe("denied");
    expect(result.missing_claims).toContain("residency_country");
  });

  it("minimum_age 21 requires product_eligibility over_21 claim", () => {
    const expanded = expandRequiredClaimsForMinimumAge({ minimum_age: 21, required_claims: [] });
    expect(expanded.some((r) => r.claim_type === "product_eligibility")).toBe(true);
  });

  it("denies identity_verified alone when minimum_age is 21", () => {
    const policy: PartnerPolicyRules = {
      minimum_age: 21,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
    };
    const result = evaluatePolicyRules(policy, [claim({ claim_type: "identity_verified" })]);
    expect(result.decision).toBe("denied");
    expect(result.missing_claims).toContain("product_eligibility");
  });

  it("approves when product_eligibility over_21 is present for minimum_age 21", () => {
    const policy: PartnerPolicyRules = {
      minimum_age: 21,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
    };
    const eligibility = productEligibilityClaim({
      subjectId: "0x1",
      jti: "jti-1",
      outcome: "over_21",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    const result = evaluatePolicyRules(policy, [
      claim({ claim_type: "identity_verified" }),
      { ...eligibility, id: "2", status: "active" as const },
    ]);
    expect(result.decision).toBe("approved");
  });

  it("denies expired product_eligibility claim", () => {
    const policy: PartnerPolicyRules = {
      minimum_age: 21,
      required_claims: [],
    };
    const eligibility = productEligibilityClaim({
      subjectId: "0x1",
      jti: "jti-1",
      outcome: "over_21",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });
    const result = evaluatePolicyRules(policy, [
      { ...eligibility, id: "2", status: "active" as const },
    ]);
    expect(result.decision).toBe("denied");
    expect(result.missing_claims).toContain("product_eligibility");
  });
});
