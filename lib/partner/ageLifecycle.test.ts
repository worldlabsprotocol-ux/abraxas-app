// FILE: lib/partner/ageLifecycle.test.ts
// Good Trouble age-verification lifecycle security and policy guards.

import { describe, expect, it } from "vitest";
import {
  abraxasCaptureApprovedClaims,
  productEligibilityClaim,
  walletBindingClaim,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { resolveEffectivePolicyRules } from "@/lib/policy/resolveEffectivePolicyRules";
import { PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { resolvePartnerFlowStep } from "@/lib/partner/relyingPartyFlow";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import type { PartnerPolicy } from "@/lib/policy/types";

const HOLDER = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const JTI = "urn:uuid:age-lifecycle-test";
const EXPIRES = new Date("2027-06-01T00:00:00Z");

function withStatus(
  claims: Omit<CredentialClaimRecord, "id" | "status">[],
): CredentialClaimRecord[] {
  return claims.map((c, i) => ({ ...c, id: `claim-${i}`, status: "active" as const }));
}

function gtPolicy(): PartnerPolicy {
  const def = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;
  return {
    id: def.id,
    partner_id: def.partnerId,
    name: def.id,
    version: 1,
    status: "active",
    rules_json: def.rules,
  };
}

function identityOnlyClaims(): CredentialClaimRecord[] {
  return withStatus([
    ...abraxasCaptureApprovedClaims({
      subjectId: HOLDER,
      jti: JTI,
      jurisdiction: "US-MO",
      documentType: "drivers_license",
      expiresAt: EXPIRES,
      captureSessionId: "cap-age-1",
      reviewMethod: "automated_biometric",
      biometricScores: { face_match: 0.95, liveness: 0.94 },
    }),
    walletBindingClaim({ subjectId: HOLDER, walletAddress: HOLDER, bindingMethod: "zklogin" }),
  ]);
}

describe("Good Trouble age lifecycle", () => {
  const policy = gtPolicy();
  const effectiveRules = resolveEffectivePolicyRules(policy);

  it("authentication-only claims never satisfy age policy (missing product_eligibility)", () => {
    const evaluation = evaluatePolicyRules(effectiveRules, identityOnlyClaims(), {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).not.toBe("approved");
    expect(evaluation.missing_claims).toContain("product_eligibility");
  });

  it("valid product_eligibility produces approved evaluation", () => {
    const claims = withStatus([
      ...identityOnlyClaims(),
      productEligibilityClaim({
        subjectId: HOLDER,
        jti: JTI,
        outcome: "over_21",
        expiresAt: EXPIRES,
      }),
    ]);
    const evaluation = evaluatePolicyRules(effectiveRules, claims, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).toBe("approved");
  });

  it("expired product_eligibility fails policy", () => {
    const claims = withStatus([
      ...identityOnlyClaims(),
      productEligibilityClaim({
        subjectId: HOLDER,
        jti: JTI,
        outcome: "over_21",
        expiresAt: new Date("2020-01-01"),
      }),
    ]);
    const evaluation = evaluatePolicyRules(effectiveRules, claims, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).not.toBe("approved");
  });

  it("over_21 false when product_eligibility missing despite approved identity", () => {
    const evaluation = evaluatePolicyRules(effectiveRules, identityOnlyClaims(), {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    const partnerResult = buildPartnerVerificationResult({
      decision: evaluation.decision === "approved" ? "approved" : "denied",
      credentialJti: JTI,
      issuer: "did:web:abraxas.world",
      evaluatedAt: new Date().toISOString(),
      receiptId: "rcpt-test",
      receiptExpiresAt: new Date().toISOString(),
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      identityVerified: true,
      minimumAge: 21,
      productEligibilityRequired: true,
      productEligibilityVerified: Boolean(evaluation.claims.product_eligibility),
      assuranceLevel: "L2",
      reasonCodes: evaluation.reason_codes,
    });
    expect(partnerResult.over_21).toBe(false);
  });

  it("over_21 true only with verified product_eligibility", () => {
    const claims = withStatus([
      ...identityOnlyClaims(),
      productEligibilityClaim({
        subjectId: HOLDER,
        jti: JTI,
        outcome: "over_21",
        expiresAt: EXPIRES,
      }),
    ]);
    const evaluation = evaluatePolicyRules(effectiveRules, claims, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    const partnerResult = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: JTI,
      issuer: "did:web:abraxas.world",
      evaluatedAt: new Date().toISOString(),
      receiptId: "rcpt-test",
      receiptExpiresAt: new Date().toISOString(),
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      identityVerified: true,
      minimumAge: 21,
      productEligibilityRequired: true,
      productEligibilityVerified: true,
      assuranceLevel: "L2",
      reasonCodes: [],
    });
    expect(partnerResult.over_21).toBe(true);
  });

  it("repeat visit: existing credential routes to enter without passport", () => {
    const claims = withStatus([
      ...identityOnlyClaims(),
      productEligibilityClaim({
        subjectId: HOLDER,
        jti: JTI,
        outcome: "over_21",
        expiresAt: EXPIRES,
      }),
    ]);
    const evaluation = evaluatePolicyRules(effectiveRules, claims, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    const step = resolvePartnerFlowStep({
      authenticated: true,
      credentialStatus: "active",
      policyDecision: evaluation.decision,
    });
    expect(step).toBe("enter");
  });

  it("pending review does not route to enter", () => {
    const step = resolvePartnerFlowStep({
      authenticated: true,
      credentialStatus: "pending_review",
      policyDecision: "manual_review",
    });
    expect(step).toBe("pending_review");
  });
});
