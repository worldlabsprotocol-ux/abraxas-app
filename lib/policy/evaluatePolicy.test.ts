// FILE: lib/policy/evaluatePolicy.test.ts
import { describe, it, expect } from "vitest";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";

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
});
