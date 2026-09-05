// FILE: lib/partner/goodTroubleRepeatVisit.integration.test.ts
// Repeat visit: existing credential → fresh evaluation → new receipt (no re-collection).

import { describe, expect, it } from "vitest";
import {
  abraxasCaptureApprovedClaims,
  productEligibilityClaim,
  walletBindingClaim,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { resolveEffectivePolicyRules } from "@/lib/policy/resolveEffectivePolicyRules";
import { resolvePartnerFlowStep } from "@/lib/partner/relyingPartyFlow";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";
import type { PartnerPolicy } from "@/lib/policy/types";

const HOLDER = "0xrepeatvisitabcdefabcdefabcdefabcdefabcd";
const JTI = "urn:uuid:gt-repeat-visit";
const EXPIRES = new Date("2027-06-01T00:00:00Z");

function withStatus(claims: Omit<CredentialClaimRecord, "id" | "status">[]): CredentialClaimRecord[] {
  return claims.map((c, i) => ({ ...c, id: `claim-${i}`, status: "active" as const }));
}

function repeatVisitClaims(): CredentialClaimRecord[] {
  return withStatus([
    ...abraxasCaptureApprovedClaims({
      subjectId: HOLDER,
      jti: JTI,
      jurisdiction: "US-MO",
      documentType: "drivers_license",
      expiresAt: EXPIRES,
      captureSessionId: "cap-repeat-1",
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

describe("Good Trouble repeat visit", () => {
  const gtDef = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;
  const policy: PartnerPolicy = {
    id: gtDef.id,
    partner_id: gtDef.partnerId,
    name: gtDef.id,
    version: 1,
    status: "active",
    rules_json: gtDef.rules,
  };
  const effectiveRules = resolveEffectivePolicyRules(policy);

  it("re-evaluates existing credential without requiring new evidence collection", () => {
    const claims = repeatVisitClaims();
    const evaluation = evaluatePolicyRules(effectiveRules, claims, {
      jurisdiction: "US",
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    });
    expect(evaluation.decision).toBe("approved");
    const step = resolvePartnerFlowStep({
      authenticated: true,
      credentialStatus: "active",
      policyDecision: evaluation.decision,
    });
    expect(step).toBe("enter");
  });

  it("issues a fresh partner-bound receipt with new receipt_id per visit", () => {
    const receiptA = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: JTI,
      issuer: "did:web:abraxas.world",
      evaluatedAt: new Date("2026-09-05T10:00:00Z").toISOString(),
      receiptId: "rcpt-visit-a",
      receiptExpiresAt: new Date("2026-09-06T10:00:00Z").toISOString(),
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      identityVerified: true,
      minimumAge: 21,
      productEligibilityRequired: true,
      productEligibilityVerified: true,
      assuranceLevel: "L2",
    });
    const receiptB = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: JTI,
      issuer: "did:web:abraxas.world",
      evaluatedAt: new Date("2026-09-05T11:00:00Z").toISOString(),
      receiptId: "rcpt-visit-b",
      receiptExpiresAt: new Date("2026-09-06T11:00:00Z").toISOString(),
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      identityVerified: true,
      minimumAge: 21,
      productEligibilityRequired: true,
      productEligibilityVerified: true,
      assuranceLevel: "L2",
    });
    expect(receiptA.receipt_id).not.toBe(receiptB.receipt_id);
    expect(receiptA.over_21).toBe(true);
    expect(receiptB.over_21).toBe(true);
  });

  it("Wix server rejects receipt bound to another partner", () => {
    const result = validatePartnerFlowPublicReceipt(
      {
        receipt_id: "rcpt-repeat",
        schema_version: "1.0.0",
        partner_id: "other-partner",
        policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
        decision_result: "approved",
        signature_valid: true,
        expires_at: "2099-01-01T00:00:00.000Z",
        status: "active",
        artifact_type: "eligibility_decision_receipt",
        production_usable: false,
        decision_context: "sandbox_only",
        currently_valid: false,
        validity: "sandbox_only",
        invalidation_reasons: ["sandbox_only:not_production_usable"],
        evaluated_claim_refs: [],
      },
      {
        partnerId: GOOD_TROUBLE_PARTNER_ID,
        policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
        mode: "sandbox",
        allowSandbox: true,
        now: new Date("2026-01-01"),
      },
    );
    expect(result.ok).toBe(false);
  });
});
