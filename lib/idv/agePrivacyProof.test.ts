// FILE: lib/idv/agePrivacyProof.test.ts

import { describe, expect, it } from "vitest";
import { PARTNER_CALLBACK_PARAMS } from "@/lib/protocol/compatibility";
import { buildRedirectUrl } from "@/lib/connect/returnUrlAllowlist";
import { buildPartnerVerificationResult } from "@/lib/partner/partnerVerificationResult";
import { productEligibilityClaim } from "@/lib/credentials/claimSchema";
import { buildProductEligibilityClaimsForIssuance } from "@/lib/idv/buildProductEligibilityClaims";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";
import {
  SANDBOX_RECEIPT_FIXTURE,
} from "@/lib/partner/verifyPartnerFlowReceipt.test";
import { assertAgePrivacySafe, scanValueForAgePrivacyViolations } from "@/lib/idv/agePrivacyProof";
import { GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

const SAMPLE_DOB = "1990-03-15";

describe("age privacy proof scans", () => {
  it("issued credential claims contain only over_21 outcome, never DOB", () => {
    const claims = buildProductEligibilityClaimsForIssuance({
      subjectId: "0xholder",
      jti: "urn:uuid:privacy-test",
      documentDateOfBirth: SAMPLE_DOB,
      minimumAgeGate: 21,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    assertAgePrivacySafe(claims, "issued_claims");
    expect(claims[0]?.claim_value).toEqual({ outcome: "over_21" });
  });

  it("evaluated policy disclosed claims contain no DOB", () => {
    const gtPolicy = PRODUCTION_PARTNER_POLICIES.find((p) => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;
    const eligibility = productEligibilityClaim({
      subjectId: "0xholder",
      jti: "jti",
      outcome: "over_21",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    const evaluation = evaluatePolicyRules(gtPolicy.rules, [
      { ...eligibility, id: "1", status: "active", subject_id: "0x", credential_jti: "j", claim_type: "product_eligibility", claim_value: { outcome: "over_21" }, issuer_id: "issuer:abraxas", assurance_level: "L2", issued_at: new Date().toISOString(), expires_at: null, revocation_reference: null, evidence_reference: null, jurisdiction: null, policy_scope: null },
    ]);
    assertAgePrivacySafe(evaluation.claims, "evaluated_claims");
    expect(scanValueForAgePrivacyViolations({ documentDateOfBirth: SAMPLE_DOB }).ok).toBe(false);
  });

  it("public receipt fixture and partner result contain no DOB", () => {
    assertAgePrivacySafe(SANDBOX_RECEIPT_FIXTURE, "public_receipt");
    const partnerResult = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: "cred",
      issuer: "https://abraxasworld.xyz",
      evaluatedAt: new Date().toISOString(),
      receiptId: "dr_test",
      receiptExpiresAt: new Date("2099-01-01T00:00:00.000Z").toISOString(),
      policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partnerId: GOOD_TROUBLE_PARTNER_ID,
      identityVerified: true,
      minimumAge: 21,
    });
    assertAgePrivacySafe(partnerResult, "partner_result");
  });

  it("callback parameters contain no DOB and only frozen keys", () => {
    const redirect = buildRedirectUrl("https://www.goodtroublecanna.com/age-verification-result", {
      status: "approved",
      decision_id: "vd_test",
      receipt_id: "dr_test",
      receipt_expires_at: "2099-01-01T00:00:00.000Z",
      credential_id: "cred-jti",
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
    });
    const url = new URL(redirect);
    assertAgePrivacySafe(Object.fromEntries(url.searchParams.entries()), "callback_params");
    expect(Array.from(url.searchParams.keys()).sort()).toEqual([...PARTNER_CALLBACK_PARAMS].sort());
  });

  it("Wix response DTO and safe log args exclude secrets and PII", () => {
    const wixDto = { verified: false, code: "session_mismatch" };
    const logArgs = [{ event: "abraxas_callback_rejected", code: "session_mismatch" }];
    assertAgePrivacySafe(wixDto, "wix_dto");
    assertAgePrivacySafe(logArgs, "log_args");
    expect(scanValueForAgePrivacyViolations({ receipt: SANDBOX_RECEIPT_FIXTURE }).ok).toBe(true);
    expect(scanValueForAgePrivacyViolations({ dob: SAMPLE_DOB }).ok).toBe(false);
  });

  it("thrown/public error messages must not echo DOB", () => {
    const message = "Age privacy violation in test: root.dob:forbidden_key";
    const scan = scanValueForAgePrivacyViolations({ error: message });
    expect(scan.ok).toBe(true);
    expect(scanValueForAgePrivacyViolations({ error: `invalid dob ${SAMPLE_DOB}` }).ok).toBe(false);
  });
});
