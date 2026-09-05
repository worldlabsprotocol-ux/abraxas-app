// FILE: lib/assurance/crossIndustryCompliance.test.ts
// Cross-industry compliance guards — shared primitives, no industry-specific engine shortcuts.

import { describe, expect, it } from "vitest";
import {
  abraxasCaptureApprovedClaims,
  productEligibilityClaim,
  walletBindingClaim,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import {
  PRODUCTION_PARTNER_POLICIES,
  GOOD_TROUBLE_RETAIL_V2_PENDING_RULES,
} from "@/lib/policy/productionPolicyContract";
import {
  resolvePolicyOverlayDecision,
  resolveEffectivePolicyRules,
} from "@/lib/policy/resolveEffectivePolicyRules";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { buildAssuranceBoundarySummary } from "@/lib/partner/assuranceBoundary";
import { assertMerchantSafeCredentialView } from "@/lib/assurance/reusableCredential";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import type { PartnerPolicy } from "@/lib/policy/types";

const HOLDER = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const JTI = "urn:uuid:cross-industry-test";
const EXPIRES = new Date("2027-06-01T00:00:00Z");

function withStatus(claims: Omit<CredentialClaimRecord, "id" | "status">[]): CredentialClaimRecord[] {
  return claims.map((c, i) => ({ ...c, id: `claim-${i}`, status: "active" as const }));
}

function cannabisAgeCredentialBundle(): CredentialClaimRecord[] {
  return withStatus([
    ...abraxasCaptureApprovedClaims({
      subjectId: HOLDER,
      jti: JTI,
      jurisdiction: "US-MO",
      documentType: "drivers_license",
      expiresAt: EXPIRES,
      captureSessionId: "cap-cross-1",
      reviewMethod: "automated_biometric",
      biometricScores: { face_match: 0.95, liveness: 0.94 },
    }),
    walletBindingClaim({ subjectId: HOLDER, walletAddress: HOLDER, bindingMethod: "zklogin" }),
    productEligibilityClaim({
      subjectId: HOLDER,
      jti: JTI,
      outcome: "over_21",
      expiresAt: EXPIRES,
    }),
  ]);
}

describe("cross-industry compliance architecture", () => {
  const financialPolicy = PRODUCTION_PARTNER_POLICIES.find(p => p.id === "abraxas-rwa-us-v1")!;
  const gtPolicyDef = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;

  it("cannabis age credential cannot automatically satisfy unrelated financial policy", () => {
    const claims = cannabisAgeCredentialBundle();
    const evaluation = evaluatePolicyRules(financialPolicy.rules, claims, {
      jurisdiction: "US",
      partnerId: "abraxas",
      policyId: financialPolicy.id,
    });
    expect(evaluation.decision).not.toBe("approved");
    expect(evaluation.missing_claims).toContain("screening_outcome");
  });

  it("credential valid in one jurisdiction can fail another jurisdiction", () => {
    const claims = cannabisAgeCredentialBundle();
    const blockedRules = {
      ...GOOD_TROUBLE_RETAIL_V2_PENDING_RULES,
      blocked_jurisdictions: ["US-MO"],
    };
    const evaluation = evaluatePolicyRules(blockedRules, claims, {
      jurisdiction: "US-MO",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).toBe("denied");
    expect(evaluation.reason_codes).toContain("jurisdiction_blocked");
  });

  it("partner-bound receipt cannot validate for another partner", () => {
    const result = validatePartnerFlowPublicReceipt(
      {
        receipt_id: "dr_cross",
        schema_version: "1.0.0",
        partner_id: "other-partner",
        policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
        decision_result: "approved",
        signature_valid: true,
        expires_at: "2099-01-01T00:00:00.000Z",
        status: "active",
        artifact_type: "eligibility_decision_receipt",
        production_usable: true,
        decision_context: "production",
        currently_valid: true,
        validity: "active",
        invalidation_reasons: [],
        evaluated_claim_refs: [],
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        now: new Date("2026-01-01"),
      },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.startsWith("partner_mismatch"))).toBe(true);
  });

  it("authentication alone cannot satisfy identity or eligibility requirements", () => {
    const authOnly = withStatus([
      walletBindingClaim({ subjectId: HOLDER, walletAddress: HOLDER, bindingMethod: "zklogin" }),
    ]);
    const evaluation = evaluatePolicyRules(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, authOnly, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).not.toBe("approved");
    expect(evaluation.missing_claims).toContain("identity_verified");
    expect(evaluation.missing_claims).toContain("product_eligibility");
  });

  it("stronger policies reject lower-assurance evidence", () => {
    const lowAssurance = withStatus(
      abraxasCaptureApprovedClaims({
        subjectId: HOLDER,
        jti: JTI,
        jurisdiction: "US-MO",
        documentType: "drivers_license",
        expiresAt: EXPIRES,
        captureSessionId: "cap-low",
        reviewMethod: "automated_biometric",
        biometricScores: { face_match: 0.95, liveness: 0.94 },
        assuranceLevel: "L1",
      }),
    );
    const evaluation = evaluatePolicyRules(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, lowAssurance, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).not.toBe("approved");
  });

  it("expired and revoked claims fail across industries", () => {
    const expired = withStatus([
      ...cannabisAgeCredentialBundle().map(c =>
        c.claim_type === "product_eligibility"
          ? { ...c, expires_at: "2020-01-01T00:00:00.000Z" }
          : c,
      ),
    ]);
    const evalExpired = evaluatePolicyRules(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, expired, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evalExpired.decision).not.toBe("approved");

    const revoked = cannabisAgeCredentialBundle().map(c => ({ ...c, status: "revoked" as const }));
    const evalRevoked = evaluatePolicyRules(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, revoked, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evalRevoked.decision).not.toBe("approved");
  });

  it("transaction-time obligations remain outstanding when reusable eligibility exists", () => {
    const boundary = buildAssuranceBoundarySummary({
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      identityVerified: true,
      productEligibilityVerified: true,
      productEligibilityRequired: true,
      minimumAge: 21,
    });
    expect(boundary.authoritative_age_evidence_present).toBe(true);
    expect(boundary.evidence_classes_required).toContain("transaction_time_merchant_obligation");
    expect(boundary.evidence_classes_satisfied).not.toContain("transaction_time_merchant_obligation");
  });

  it("partners receive policy results without underlying personal data", () => {
    const result = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: JTI,
      issuer: "did:web:abraxas.world",
      evaluatedAt: new Date().toISOString(),
      receiptId: "rcpt-1",
      receiptExpiresAt: EXPIRES.toISOString(),
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      identityVerified: true,
      minimumAge: 21,
      productEligibilityRequired: true,
      productEligibilityVerified: true,
      assuranceLevel: "L2",
      reasonCodes: [],
    });
    expect(() => assertMerchantSafeCredentialView(result as unknown as Record<string, unknown>)).not.toThrow();
    expect(result).not.toHaveProperty("date_of_birth");
    expect(result).not.toHaveProperty("legal_name");
  });

  it("pending and denied partner results never set over_21", () => {
    for (const decision of ["denied", "manual_review"] as const) {
      const result = buildPartnerVerificationResult({
        decision,
        credentialJti: JTI,
        issuer: "did:web:abraxas.world",
        evaluatedAt: new Date().toISOString(),
        receiptId: "rcpt-1",
        receiptExpiresAt: EXPIRES.toISOString(),
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        identityVerified: true,
        minimumAge: 21,
        productEligibilityRequired: true,
        productEligibilityVerified: true,
        assuranceLevel: "L2",
      });
      expect(result.over_21).toBe(false);
    }
  });
});

describe("resolveEffectivePolicyRules sandbox overlay guards", () => {
  const gtV1 = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;

  function asPolicy(rules: typeof gtV1.rules, overrides?: Partial<PartnerPolicy>): PartnerPolicy {
    return {
      id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      name: "Good Trouble Retail",
      version: 1,
      status: "active",
      rules_json: rules,
      ...overrides,
    };
  }

  it("overlay applies only to sandbox GT retail v1", () => {
    const decision = resolvePolicyOverlayDecision(asPolicy(gtV1.rules));
    expect(decision.overlay_applied).toBe(true);
    expect(decision.overlay_reason).toBe("sandbox_pilot_overlay");
  });

  it("overlay removed after operator publishes v2 (product_eligibility in stored rules)", () => {
    const published = asPolicy(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, { version: 2 });
    const decision = resolvePolicyOverlayDecision(published);
    expect(decision.overlay_applied).toBe(false);
    expect(decision.overlay_reason).toBe("published_registry");
    expect(resolveEffectivePolicyRules(published)).toEqual(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES);
  });

  it("overlay does not apply when sandbox_only is false (production path)", () => {
    const productionRules = { ...gtV1.rules, sandbox_only: false };
    const decision = resolvePolicyOverlayDecision(asPolicy(productionRules));
    expect(decision.overlay_applied).toBe(false);
    expect(decision.overlay_reason).toBe("stored_rules");
    expect(decision.effective_rules).toEqual(productionRules);
  });

  it("overlay does not affect other partners or policies", () => {
    for (const policy of PRODUCTION_PARTNER_POLICIES) {
      if (policy.id === GOOD_TROUBLE_RETAIL_POLICY_ID) continue;
      const decision = resolvePolicyOverlayDecision({
        id: policy.id,
        partner_id: policy.partnerId,
        name: policy.id,
        version: 1,
        status: "active",
        rules_json: policy.rules,
      });
      expect(decision.overlay_applied).toBe(false);
    }
  });
});
