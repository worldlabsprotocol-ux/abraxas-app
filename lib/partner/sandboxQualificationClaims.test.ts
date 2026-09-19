import { describe, expect, it } from "vitest";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { isInadequateCircleSettlementReceipt } from "@/lib/partner/eligibilityMethods";
import { deriveServerSandboxQualificationClaims } from "./sandboxQualificationClaims";
import type { MethodQualificationRecord } from "./partnerMethodQualification";

const RECORD: MethodQualificationRecord = {
  verifyRequestId: "vr-sandbox-1",
  partnerId: "circle-arc-demo-304",
  policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
  policyVersion: 1,
  methodId: "privacy_preserving",
  state: "qualified",
  qualified: true,
  issuedReceipt: false,
  sandboxOnly: true,
};

describe("deriveServerSandboxQualificationClaims", () => {
  it("maps a verified sandbox qualification to product_eligibility and never a receipt", () => {
    const claims = deriveServerSandboxQualificationClaims({
      record: RECORD,
      subjectId: "0xabc",
      storedPartnerId: RECORD.partnerId,
      storedPolicyId: RECORD.policyId,
      storedPolicyVersion: 1,
    });
    expect(claims).toHaveLength(1);
    expect(claims[0]?.claim_type).toBe("product_eligibility");
    expect(claims[0]?.issuer_id).toBe("issuer:abraxas-sandbox");
    expect(claims[0]?.claim_value.outcome).toBe("sandbox_demo_eligible");
    expect(claims[0]?.claim_value.environment).toBe("sandbox");
  });

  it("returns no claims for cookie-only mismatches, stale versions, or authoritative policies", () => {
    expect(deriveServerSandboxQualificationClaims({
      record: RECORD,
      subjectId: "0xabc",
      storedPartnerId: "other-partner",
      storedPolicyId: RECORD.policyId,
    })).toEqual([]);
    expect(deriveServerSandboxQualificationClaims({
      record: { ...RECORD, policyVersion: 1 },
      subjectId: "0xabc",
      storedPartnerId: RECORD.partnerId,
      storedPolicyId: RECORD.policyId,
      storedPolicyVersion: 99,
    })).toEqual([]);
    expect(deriveServerSandboxQualificationClaims({
      record: { ...RECORD, sandboxOnly: false, policyId: "good-trouble-retail-v1" },
      subjectId: "0xabc",
      storedPartnerId: "good-trouble-cannabis",
      storedPolicyId: "good-trouble-retail-v1",
    })).toEqual([]);
  });
});

describe("sandbox qualification consent evaluation", () => {
  const sandboxRules = POLICY_PACKS.sandbox_economic_demo.rules;
  const retailRules = POLICY_PACKS.age_21_retail.rules;

  it("permits sandbox_economic_demo only after server-derived qualification claims", () => {
    const missing = evaluatePolicyRules(sandboxRules, []);
    expect(missing.decision).toBe("denied");
    expect(missing.reason_codes.some((code) => code.startsWith("missing:"))).toBe(true);
    expect(missing.production_usable).toBe(false);

    const claims = deriveServerSandboxQualificationClaims({
      record: RECORD,
      subjectId: "0xabc",
      storedPartnerId: RECORD.partnerId,
      storedPolicyId: RECORD.policyId,
      storedPolicyVersion: 1,
    });
    const permitted = evaluatePolicyRules(sandboxRules, claims);
    expect(permitted.decision).toBe("approved");
    expect(permitted.decision_context).toBe("sandbox_only");
    expect(permitted.production_usable).toBe(false);
    expect(permitted.claims.product_eligibility).toBeTruthy();
    expect(isInadequateCircleSettlementReceipt({
      policy_id: RECORD.policyId,
      production_usable: false,
      decision_context: "sandbox_only",
      evaluated_claim_refs: [{ claim_type: "product_eligibility", issuer_id: "issuer:abraxas-sandbox" }],
    }).inadequate).toBe(false);
  });

  it("rejects sandbox evidence against an authoritative policy", () => {
    const claims = deriveServerSandboxQualificationClaims({
      record: RECORD,
      subjectId: "0xabc",
      storedPartnerId: RECORD.partnerId,
      storedPolicyId: RECORD.policyId,
      storedPolicyVersion: 1,
    });
    const denied = evaluatePolicyRules(retailRules, claims);
    expect(denied.decision).toBe("denied");
    expect(denied.production_usable).toBe(false);
  });
});
