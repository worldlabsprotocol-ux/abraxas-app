// FILE: lib/partner/goodTroublePurchaseVerticalSlice.contract.test.ts
// Vertical slice contract: maps scope steps 1–10 to existing modules and edge-case invariants.

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_CANONICAL_HANDOFF,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES } from "@/lib/goodTrouble/pilotAgeEligibilityPolicy";
import { HOSTED_HANDOFF_TTL_MS } from "@/lib/partner/hostedHandoff/contract";
import {
  buildPartnerFlowSessionIdempotencyKey,
  buildPartnerFlowVerificationRequestIdempotencyKey,
} from "@/lib/partner/partnerFlowIdempotency";
import { evaluateMethodQualification } from "@/lib/partner/partnerMethodQualification";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";
import {
  mapGoodTroublePurchaseAttestError,
  mapGoodTroublePurchaseQualifyError,
} from "@/lib/partner/goodTroublePurchaseSelfAttestErrors";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";
import { selfAttestationRowToClaim } from "@/lib/assurance/selfAttestation/selfAttestationClaims";
import { isStaleEvidenceReissueEligible } from "@/lib/partner/partnerFlowStaleEvidenceReissue";
import { scanValueForAgePrivacyViolations } from "@/lib/idv/agePrivacyProof";

const VR_ID = "vr-vertical-slice-1";
const SUBJECT = "0xholder_vertical_slice";

describe("Good Trouble purchase vertical slice contract", () => {
  it("1. partner handoff API path is canonical hosted-handoff", () => {
    expect(GOOD_TROUBLE_CANONICAL_HANDOFF.endpoint).toBe("/api/v1/partner-handoff");
    expect(GOOD_TROUBLE_CANONICAL_HANDOFF.hosted_flow_path).toBe("/partner/continue");
    expect(GOOD_TROUBLE_CANONICAL_HANDOFF.verify_method).toBe("AbraxasPartnerKit.verifyForAction");
  });

  it("2. holder continue recognizes canonical purchase tuple", () => {
    expect(isCanonicalGoodTroublePurchaseFlow({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
    })).toBe(true);
  });

  it("3. policy enforces account + consent without treating sign-in as age proof", () => {
    const rules = findProductionPolicyRules(GOOD_TROUBLE_CANONICAL_POLICY_ID)
      ?? GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES;
    expect(rules.account_required).toBe(true);
    expect(rules.consent_required).toBe(true);
    expect(rules.age_eligibility_only).toBe(true);
    expect(rules.required_claims?.[0]?.claim_type).toBe("self_attested_age_band");
  });

  it("4. canonical path uses L0 DOB — not IDV/camera (legacy path separate)", () => {
    const idv = evaluateMethodQualification({
      methodId: "identity_liveness",
      storedPartnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      storedPolicyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      verifyRequestId: VR_ID,
      policyRules: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
      identityEvidenceComplete: true,
    });
    expect(idv.ok).toBe(false);

    const l0 = evaluateMethodQualification({
      methodId: "self_attestation",
      storedPartnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      storedPolicyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      verifyRequestId: VR_ID,
      policyRules: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
      selfAttestationActive: true,
    });
    expect(l0.ok).toBe(true);
  });

  it("5. narrow receipt only after over_21 evidence + policy approval", () => {
    const under21 = evaluatePolicyRules(GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES, [
      selfAttestationRowToClaim({
        id: "sa-under",
        holder_ref: SUBJECT,
        partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        age_band: "under_21",
        assurance_level: "L0",
        provenance: "user_self_attestation",
        purpose: "purchase",
        attested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        revoked_at: null,
        browse_receipt_id: null,
        created_at: new Date().toISOString(),
      }),
    ], {
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      policyRules: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
    });
    expect(under21.decision).not.toBe("approved");

    const over21 = evaluatePolicyRules(GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES, [
      selfAttestationRowToClaim({
        id: "sa-over",
        holder_ref: SUBJECT,
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
      }),
    ], {
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      policyRules: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
    });
    expect(over21.decision).toBe("approved");
    expect(over21.production_usable).toBe(true);
  });

  it("6. partner receipt surface excludes DOB and identity fields", () => {
    const sampleReceipt = {
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      decision_result: "approved",
      disclosed_result: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
      signature_valid: true,
    };
    const privacyScan = scanValueForAgePrivacyViolations(sampleReceipt);
    expect(privacyScan.ok).toBe(true);
    expect(privacyScan.violations).toEqual([]);
  });

  it("7. idempotency keys bind duplicate completions to same verification request", () => {
    const sessionKey = buildPartnerFlowSessionIdempotencyKey({
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      subjectId: SUBJECT,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    });
    const vrKey = buildPartnerFlowVerificationRequestIdempotencyKey(VR_ID);
    expect(sessionKey).toContain(GOOD_TROUBLE_CANONICAL_PARTNER_ID);
    expect(vrKey).toBe(`pf_vr:${VR_ID}`);
    expect(sessionKey).not.toBe(vrKey);
  });

  it("8. handoff TTL defines expired window for interrupted flows", () => {
    expect(HOSTED_HANDOFF_TTL_MS).toBe(15 * 60 * 1000);
  });

  it("9. revoked evidence fails closed; stale refresh may reissue", () => {
    expect(isStaleEvidenceReissueEligible({
      currently_valid: false,
      invalidation_reasons: ["claim_revoked"],
    })).toBe(false);
    expect(isStaleEvidenceReissueEligible({
      currently_valid: false,
      invalidation_reasons: ["source_evidence_revoked"],
    })).toBe(true);
  });

  it("10. interrupted session and qualification errors surface safe holder recovery", () => {
    expect(mapGoodTroublePurchaseAttestError("auth_required")).toMatch(/session expired/i);
    expect(mapGoodTroublePurchaseQualifyError("method_not_qualified")).toMatch(/21\+/i);
  });
});
