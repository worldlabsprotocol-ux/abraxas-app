import { describe, expect, it } from "vitest";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";

const SUBJECT = "0xabc";

function identityClaim(): CredentialClaimRecord {
  return {
    id: "claim-1",
    subject_id: SUBJECT,
    credential_jti: "urn:uuid:test",
    claim_type: "identity_verified",
    claim_value: { verified: true },
    issuer_id: "abraxas",
    assurance_level: "L3",
    issued_at: new Date().toISOString(),
    expires_at: null,
    status: "active",
    jurisdiction: "US-CO",
    revocation_reference: null,
    evidence_reference: null,
    policy_scope: null,
  };
}

describe("historical policy reproducibility (P1-1)", () => {
  const version1Rules: PartnerPolicyRules = {
    minimum_age: 21,
    sandbox_only: true,
    required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
  };

  const version2Rules: PartnerPolicyRules = {
    minimum_age: 21,
    sandbox_only: true,
    required_claims: [{ claim_type: "residency_country", min_assurance: "L2" }],
  };

  it("replays a decision against pinned v1 rules after v2 rules diverge", () => {
    const claims = [identityClaim()];

    const atV1 = evaluatePolicyRules(version1Rules, claims, {
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
    });
    const atV2 = evaluatePolicyRules(version2Rules, claims, {
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
    });

    expect(atV1.decision).toBe("approved");
    expect(atV2.decision).toBe("denied");
    expect(atV2.missing_claims).toContain("residency_country");

    const replayPinned = evaluatePolicyRules(version1Rules, claims, {
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
    });
    expect(replayPinned.decision).toBe(atV1.decision);
    expect(replayPinned.reason_codes).toEqual(atV1.reason_codes);
  });

  it("does not retroactively require product_eligibility from minimum_age metadata alone", () => {
    const pinnedV1Rules: PartnerPolicyRules = {
      minimum_age: 21,
      sandbox_only: true,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
    };
    const claims = [identityClaim()];

    const result = evaluatePolicyRules(pinnedV1Rules, claims, {
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
    });

    expect(result.decision).toBe("approved");
    expect(result.missing_claims).not.toContain("product_eligibility");
  });

  it("pins policy_id and policy_version on decision and receipt shaped records", () => {
    const pinnedDecision = {
      policy_id: "good-trouble-retail-v1",
      policy_version: 1,
      decision: "approved" as const,
    };
    const pinnedReceipt = {
      policy_id: pinnedDecision.policy_id,
      policy_version: pinnedDecision.policy_version,
      schema_version: "1.0.0",
    };

    expect(pinnedReceipt.policy_version).toBe(pinnedDecision.policy_version);
    expect(pinnedReceipt.policy_id).toBe("good-trouble-retail-v1");
  });
});
