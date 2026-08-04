// FILE: lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts
// End-to-end wiring test: IDV issuance → GT policy → partner flow → signed Trust Decision.

import { describe, expect, it } from "vitest";
import {
  abraxasCaptureApprovedClaims,
  manualApprovedClaims,
  veriffApprovedClaims,
  walletBindingClaim,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { resolvePartnerFlowStep } from "@/lib/partner/relyingPartyFlow";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { computeSessionReceiptExpiresAt } from "@/lib/partner/sessionReceipt";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";

const HOLDER = "0x1234567890abcdef1234567890abcdef12345678";
const JTI = "urn:uuid:gt-e2e-test";
const EXPIRES = new Date("2027-06-01T00:00:00Z");
const JURISDICTION = "US-MO";

function withStatus(
  claims: Omit<CredentialClaimRecord, "id" | "status">[],
): CredentialClaimRecord[] {
  return claims.map((c, i) => ({
    ...c,
    id: `claim-${i}`,
    status: "active" as const,
  }));
}

function fullGoodTroubleClaimBundle(
  provider: "capture" | "manual" | "veriff",
): CredentialClaimRecord[] {
  const base = {
    subjectId: HOLDER,
    jti: JTI,
    jurisdiction: JURISDICTION,
    documentType: "drivers_license",
    expiresAt: EXPIRES,
  };

  const idvClaims = provider === "capture"
    ? abraxasCaptureApprovedClaims({
        ...base,
        captureSessionId: "cap-e2e-1",
        reviewMethod: "automated_biometric",
        biometricScores: { face_match: 0.95, liveness: 0.94 },
      })
    : provider === "manual"
      ? manualApprovedClaims({ ...base, reviewId: "manual-e2e-1" })
      : veriffApprovedClaims({ ...base, veriffSessionId: "veriff-e2e-1" });

  return withStatus([
    ...idvClaims,
    walletBindingClaim({
      subjectId: HOLDER,
      walletAddress: HOLDER,
      bindingMethod: "zklogin",
    }),
  ]);
}

describe("Good Trouble retail — full backend wiring", () => {
  const gtPolicy = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;

  it("denies when residency_country is missing (regression guard)", () => {
    const claims = fullGoodTroubleClaimBundle("capture").filter(
      c => c.claim_type !== "residency_country",
    );
    const evaluation = evaluatePolicyRules(gtPolicy.rules, claims, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).toBe("denied");
    expect(evaluation.missing_claims).toContain("residency_country");
  });

  for (const provider of ["capture", "manual", "veriff"] as const) {
    it(`${provider} path: credential issuance → policy approved → next enter`, () => {
      // 1. Document capture / admin approval → credential issuance (claims bundle)
      const claims = fullGoodTroubleClaimBundle(provider);
      expect(claims.some(c => c.claim_type === "residency_country")).toBe(true);
      expect(claims.find(c => c.claim_type === "residency_country")?.claim_value).toEqual({
        country: "US",
        state: "MO",
      });

      // 2. Trust Engine policy evaluation
      const evaluation = evaluatePolicyRules(gtPolicy.rules, claims, {
        jurisdiction: "US",
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      });
      expect(evaluation.decision).toBe("approved");
      expect(evaluation.missing_claims).toHaveLength(0);
      expect(evaluation.decision_context).toBe("sandbox_only");

      // 3. Partner flow step resolution (authenticated holder with active credential)
      const next = resolvePartnerFlowStep({
        authenticated: true,
        credentialStatus: "active",
        policyDecision: evaluation.decision,
      });
      expect(next).toBe("enter");

      // 4. Signed Trust Decision payload (session receipt partner result)
      const evaluatedAt = new Date().toISOString();
      const receiptExpiresAt = computeSessionReceiptExpiresAt(gtPolicy.rules);
      const partnerResult = buildPartnerVerificationResult({
        decision: "approved",
        credentialJti: JTI,
        issuer: "https://abraxas-app.vercel.app",
        evaluatedAt,
        receiptId: "dr_gt_e2e",
        receiptExpiresAt,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        identityVerified: true,
        minimumAge: gtPolicy.rules.minimum_age,
        assuranceLevel: "L2",
      });

      expect(partnerResult.decision).toBe("approved");
      expect(partnerResult.over_21).toBe(true);
      expect(partnerResult.receipt_id).toBe("dr_gt_e2e");
      expect(partnerResult).not.toHaveProperty("date_of_birth");
    });
  }

  it("mirrors migration 049+050+051 policy rules", () => {
    expect(gtPolicy.rules.required_claims).toHaveLength(4);
    expect(gtPolicy.rules.biometric_thresholds?.face_min).toBe(0.90);
    expect(gtPolicy.rules.minimum_age).toBe(21);
    expect(gtPolicy.rules.session_receipt_hours).toBe(24);
    expect(gtPolicy.rules.product_eligibility_action).toBe("regulated_retail_purchase");
  });
});
