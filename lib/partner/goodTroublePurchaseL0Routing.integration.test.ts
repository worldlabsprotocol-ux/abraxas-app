// FILE: lib/partner/goodTroublePurchaseL0Routing.integration.test.ts
// Regression: Good Trouble ORDER NOW must use L0 age eligibility — never IDV/camera/liveness.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES } from "@/lib/goodTrouble/pilotAgeEligibilityPolicy";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";
import { evaluateMethodQualification } from "@/lib/partner/partnerMethodQualification";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";
import { policyPackRequiresIdentityEvidence } from "@/lib/partner/launchpad/policyPacks";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { selfAttestationRowToClaim } from "@/lib/assurance/selfAttestation/selfAttestationClaims";
import type { SelfAttestationLedgerRow } from "@/lib/assurance/selfAttestation/selfAttestationLedger";

const mockCreateRequest = vi.fn();
const mockGetPolicy = vi.fn();
const mockRevocation = vi.fn();
vi.mock("@/lib/verification/requestsService", () => ({
  createVerificationRequest: (...args: unknown[]) => mockCreateRequest(...args),
  getPolicy: (...args: unknown[]) => mockGetPolicy(...args),
}));

vi.mock("@/lib/partner/partnerFlowRevocationRuntime", () => ({
  checkPartnerFlowRevocationGate: (...args: unknown[]) => mockRevocation(...args),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: vi.fn().mockResolvedValue(true),
  buildRedirectUrl: vi.fn(),
}));

import { evaluatePartnerFlow } from "@/lib/partner/relyingPartyFlow";
import { inferPolicyPackFromPolicyId, policyPackRequiresIdentityEvidence } from "@/lib/partner/launchpad/policyPacks";
import { policyRequiresIdentityEvidenceForPurchase } from "@/lib/goodTrouble/pilotAgeEligibilityPolicy";

const PURCHASE_RETURN_URL =
  "https://www.goodtroublecanna.com/age-verification-result?gtv=gtf_" + "c".repeat(64);

const PILOT_RULES = GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES;

function purchaseSelfAttestClaim(overrides: Partial<SelfAttestationLedgerRow> = {}) {
  const row: SelfAttestationLedgerRow = {
    id: "sa-1",
    holder_ref: "0xholder",
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    age_band: "over_21",
    assurance_level: "L0",
    provenance: "user_self_attestation",
    purpose: "purchase",
    attested_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    revoked_at: null,
    browse_receipt_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
  return selfAttestationRowToClaim(row);
}

describe("Good Trouble purchase L0 age eligibility integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevocation.mockResolvedValue(null);
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      version: 3,
      rules_json: PILOT_RULES,
    });
    mockCreateRequest.mockResolvedValue({ request_id: "vr-gt-purchase-1" });
  });

  it("1. production contract defines age_eligibility_only without identity_verified", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_CANONICAL_POLICY_ID);
    expect(rules?.age_eligibility_only).toBe(true);
    expect(rules?.minimum_assurance_cap).toBe("L0");
    expect(rules?.required_claims?.some((r) => r.claim_type === "identity_verified")).toBe(false);
    expect(rules?.required_claims?.[0]?.claim_type).toBe("self_attested_age_band");
  });

  it("2. canonical purchase flow is recognized for ORDER NOW tuple", () => {
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
    })).toBe(true);
  });

  it("3. evaluatePartnerFlow routes age eligibility purchase to passport (not L2 credential receipt)", async () => {
    const result = await evaluatePartnerFlow({
      suiAddress: "0xabc123",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      returnUrl: PURCHASE_RETURN_URL,
      purpose: "purchase",
    });

    expect(result.next).toBe("passport");
    expect(result.verification_request_id).toBe("vr-gt-purchase-1");
    expect(mockCreateRequest).toHaveBeenCalled();
  });

  it("4. method qualification accepts self_attestation for pilot policy", () => {
    const result = evaluateMethodQualification({
      methodId: "self_attestation",
      storedPartnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      storedPolicyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      verifyRequestId: "vr-1",
      policyRules: PILOT_RULES,
      selfAttestationActive: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.methodId).toBe("self_attestation");
    expect(result.record.qualified).toBe(true);
  });

  it("5. method qualification rejects identity_liveness for pilot policy", () => {
    const result = evaluateMethodQualification({
      methodId: "identity_liveness",
      storedPartnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      storedPolicyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      verifyRequestId: "vr-1",
      policyRules: PILOT_RULES,
      identityEvidenceComplete: true,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("method_not_qualified");
  });

  it("6. policy evaluation approves L0 self_attested_age_band for purchase", () => {
    const claim = purchaseSelfAttestClaim();
    const evaluation = evaluatePolicyRules(PILOT_RULES, [claim], {
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      policyRules: PILOT_RULES,
    });
    expect(evaluation.decision).toBe("approved");
    expect(evaluation.production_usable).toBe(true);
    expect(evaluation.missing_claims).not.toContain("identity_verified");
  });

  it("7. receipt evaluation uses L0 claim — not L2 identity", () => {
    const claim = purchaseSelfAttestClaim();
    expect(claim.assurance_level).toBe("L0");
    expect(claim.claim_type).toBe("self_attested_age_band");
    expect(claim.claim_value.purpose).toBe("purchase");
  });

  it("8. unrelated age_21_retail pack template still requires identity for other partners", () => {
    const inferred = inferPolicyPackFromPolicyId("other-partner-age_21_retail-v1");
    expect(inferred).not.toBeNull();
    expect(policyPackRequiresIdentityEvidence(inferred!)).toBe(true);
  });

  it("9. pilot policy rules do not require identity evidence", () => {
    expect(policyRequiresIdentityEvidenceForPurchase(PILOT_RULES)).toBe(false);
  });

  it("10. legacy retail policy still requires identity evidence", () => {
    const legacyRules = findProductionPolicyRules("good-trouble-retail-v1");
    expect(legacyRules?.required_claims?.some((r) => r.claim_type === "identity_verified")).toBe(true);
    expect(policyRequiresIdentityEvidenceForPurchase(legacyRules!)).toBe(true);
  });
});
