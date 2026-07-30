import { describe, expect, it, vi, beforeEach } from "vitest";
import { evaluatePolicyForSubject } from "@/lib/policy/evaluateSubjectPolicy";
import { PolicyOwnershipError } from "@/lib/policy/assertPolicyOwnership";
import type { PartnerPolicy } from "@/lib/policy/types";

const policy: PartnerPolicy = {
  id: "good-trouble-retail-v1",
  partner_id: "good-trouble-cannabis",
  version: 1,
  name: "GT",
  rules_json: {
    required_claims: [{ claim_type: "identity_verified", accepted_issuers: ["issuer:abraxas"] }],
  },
  status: "active",
};

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: vi.fn(),
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: vi.fn(),
}));

vi.mock("@/lib/trust/loadPolicyTrustContext", () => ({
  loadPolicyTrustContext: vi.fn(async () => ({
    jurisdiction: "US",
    partnerId: "good-trouble-cannabis",
    policyId: "good-trouble-retail-v1",
    trustRulesByClaimType: new Map([
      ["identity_verified", { accepted_issuer_ids: ["issuer:abraxas"], minimum_assurance_level: "L2" }],
    ]),
  })),
}));

describe("P0-POL-1: evaluatePolicyForSubject trust context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects cross-partner policy access", async () => {
    const { getPartnerPolicy } = await import("@/lib/policy/getPolicy");
    vi.mocked(getPartnerPolicy).mockResolvedValue({
      ...policy,
      partner_id: "other-partner",
    });

    await expect(evaluatePolicyForSubject({
      suiAddress: "0xabc",
      policyId: policy.id,
      partnerId: "good-trouble-cannabis",
    })).rejects.toThrow(PolicyOwnershipError);
  });

  it("denies when claim issuer is not in accepted_issuers", async () => {
    const { getPartnerPolicy } = await import("@/lib/policy/getPolicy");
    const { getActiveClaims } = await import("@/lib/credentials/claimsService");
    vi.mocked(getPartnerPolicy).mockResolvedValue(policy);
    vi.mocked(getActiveClaims).mockResolvedValue([
      {
        id: "c1",
        subject_id: "0xabc",
        credential_jti: "jti",
        claim_type: "identity_verified",
        claim_value: {},
        issuer_id: "issuer:untrusted",
        assurance_level: "L2",
        issued_at: new Date().toISOString(),
        expires_at: null,
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: "US",
        policy_scope: null,
      },
    ]);

    const { evaluation } = await evaluatePolicyForSubject({
      suiAddress: "0xabc",
      policyId: policy.id,
      partnerId: "good-trouble-cannabis",
    });

    expect(evaluation.decision).toBe("denied");
    expect(evaluation.missing_claims).toContain("identity_verified");
  });

  it("approves when trusted issuer satisfies policy", async () => {
    const { getPartnerPolicy } = await import("@/lib/policy/getPolicy");
    const { getActiveClaims } = await import("@/lib/credentials/claimsService");
    vi.mocked(getPartnerPolicy).mockResolvedValue(policy);
    vi.mocked(getActiveClaims).mockResolvedValue([
      {
        id: "c1",
        subject_id: "0xabc",
        credential_jti: "jti",
        claim_type: "identity_verified",
        claim_value: {},
        issuer_id: "issuer:abraxas",
        assurance_level: "L2",
        issued_at: new Date().toISOString(),
        expires_at: null,
        status: "active",
        revocation_reference: null,
        evidence_reference: null,
        jurisdiction: "US",
        policy_scope: null,
      },
    ]);

    const { evaluation } = await evaluatePolicyForSubject({
      suiAddress: "0xabc",
      policyId: policy.id,
      partnerId: "good-trouble-cannabis",
    });

    expect(evaluation.decision).toBe("approved");
  });
});
