import { beforeEach, describe, expect, it, vi } from "vitest";

const getPolicyMock = vi.fn();
const getActiveSelfAttestationsMock = vi.fn();
const createVerificationRequestMock = vi.fn();

vi.mock("@/lib/verification/requestsService", () => ({
  getPolicy: (...args: unknown[]) => getPolicyMock(...args),
  createVerificationRequest: (...args: unknown[]) => createVerificationRequestMock(...args),
}));

vi.mock("@/lib/partner/partnerFlowRevocationRuntime", () => ({
  checkPartnerFlowRevocationGate: vi.fn(async () => null),
}));

vi.mock("@/lib/assurance/selfAttestation/selfAttestationLedger", () => ({
  getActiveSelfAttestations: (...args: unknown[]) => getActiveSelfAttestationsMock(...args),
}));

import { evaluateGoodTroublePurchaseFlow } from "@/lib/partner/relyingPartyFlow";

const ACTIVE_V2 = {
  id: "good-trouble-age_21_retail-v1",
  partner_id: "good-trouble",
  version: 2,
  status: "active",
  rules_json: {
    age_eligibility_only: true,
    minimum_assurance_cap: "L0",
    required_claims: [{ claim_type: "self_attested_age_band", must_equal: "over_21" }],
  },
};

describe("Good Trouble L0 purchase policy pin guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPolicyMock.mockResolvedValue(ACTIVE_V2);
    getActiveSelfAttestationsMock.mockResolvedValue([]);
    createVerificationRequestMock.mockResolvedValue({
      request_id: "vr-1",
      consent_url: "https://abraxasworld.xyz/consent",
      expires_at: "2099-01-01T00:00:00.000Z",
    });
  });

  it("denies when continuation pin is stale v1 while active policy is L0 v2", async () => {
    const result = await evaluateGoodTroublePurchaseFlow({
      suiAddress: "0x0000000000000000000000000000000000000000000000000000000000000001",
      partnerId: "good-trouble",
      policyId: "good-trouble-age_21_retail-v1",
      returnUrl: "https://www.goodtroublecanna.com/age-verification-result",
      purpose: "purchase",
      expectedPolicyVersion: 1,
    });

    expect(result.next).toBe("denied");
    expect(result.reason_codes).toContain("policy_version_not_adopted");
    expect(createVerificationRequestMock).not.toHaveBeenCalled();
  });

  it("continues when pin matches active v2", async () => {
    const result = await evaluateGoodTroublePurchaseFlow({
      suiAddress: "0x0000000000000000000000000000000000000000000000000000000000000001",
      partnerId: "good-trouble",
      policyId: "good-trouble-age_21_retail-v1",
      returnUrl: "https://www.goodtroublecanna.com/age-verification-result",
      purpose: "purchase",
      expectedPolicyVersion: 2,
    });

    expect(result.next).toBe("passport");
    expect(createVerificationRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      expectedPolicyVersion: 2,
    }));
  });
});
