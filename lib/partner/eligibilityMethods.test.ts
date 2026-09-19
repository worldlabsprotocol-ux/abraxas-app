import { describe, expect, it } from "vitest";
import {
  accountLoginIsNotEligibility,
  assuranceMeetsMinimum,
  isInadequateCircleSettlementReceipt,
  planEligibilityMethods,
  selfAttestationCannotSatisfyAuthoritative,
} from "@/lib/partner/eligibilityMethods";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";

describe("eligibility method planner", () => {
  it("does not treat account login as eligibility", () => {
    const plan = planEligibilityMethods({ pack: POLICY_PACKS.age_21_retail });
    const login = plan.methods.find((method) => method.id === "account_login");
    expect(login?.qualifies).toBe(false);
    expect(login?.circle_settlement_eligible).toBe(false);
    expect(accountLoginIsNotEligibility().toLowerCase()).toContain("does not prove");
  });

  it("never lets self-attestation satisfy an authoritative policy or settle Circle", () => {
    expect(selfAttestationCannotSatisfyAuthoritative(POLICY_PACKS.age_21_retail)).toBe(true);
    const plan = planEligibilityMethods({
      pack: POLICY_PACKS.age_21_retail,
      browseSelfAttestAllowed: true,
    });
    const attest = plan.methods.find((method) => method.id === "self_attestation");
    expect(attest?.qualifies).toBe(false);
    expect(attest?.circle_settlement_eligible).toBe(false);
    expect(attest?.available).toBe(false);
  });

  it("lets a partner age check satisfy the policy only when its assurance qualifies", () => {
    const tooLow = planEligibilityMethods({
      pack: POLICY_PACKS.age_21_retail,
      partnerAgeCheckConfigured: true,
      partnerAgeCheckAssurance: "L1",
    });
    expect(tooLow.methods.find((method) => method.id === "partner_age_check")?.qualifies).toBe(false);
    expect(assuranceMeetsMinimum("L1", "L2")).toBe(false);

    const ok = planEligibilityMethods({
      pack: POLICY_PACKS.age_21_retail,
      partnerAgeCheckConfigured: true,
      partnerAgeCheckAssurance: "L2",
    });
    const partner = ok.methods.find((method) => method.id === "partner_age_check");
    expect(partner?.qualifies).toBe(true);
    expect(partner?.circle_settlement_eligible).toBe(true);
    expect(partner?.primary).toBe(true);
  });

  it("offers an existing compatible proof first", () => {
    const plan = planEligibilityMethods({
      pack: POLICY_PACKS.age_21_retail,
      existingProofCompatible: true,
      partnerAgeCheckConfigured: true,
      partnerAgeCheckAssurance: "L2",
      privacyPreservingAvailable: true,
    });
    const reuse = plan.methods.find((method) => method.id === "reuse_existing_proof");
    expect(reuse?.primary).toBe(true);
    expect(reuse?.qualifies).toBe(true);
    expect(plan.methods.find((method) => method.id === "partner_age_check")?.primary).toBe(false);
    expect(plan.identity_is_default).toBe(false);
  });

  it("keeps identity/liveness optional rather than default when alternatives exist", () => {
    const plan = planEligibilityMethods({
      pack: POLICY_PACKS.age_21_retail,
      privacyPreservingAvailable: true,
    });
    const identity = plan.methods.find((method) => method.id === "identity_liveness");
    expect(identity?.available).toBe(true);
    expect(identity?.primary).toBe(false);
    expect(plan.identity_is_default).toBe(false);
    expect(plan.methods.find((method) => method.id === "privacy_preserving")?.primary).toBe(true);
  });

  it("does not make identity the sole primary CTA when no non-ID method qualifies", () => {
    const plan = planEligibilityMethods({
      pack: POLICY_PACKS.age_21_retail,
      partnerAgeCheckConfigured: true,
      partnerAgeCheckAssurance: "L0",
    });
    expect(plan.no_non_id_method_satisfies).toBe(true);
    expect(plan.methods.find((method) => method.id === "identity_liveness")?.primary).toBe(false);
    expect(plan.methods.find((method) => method.id === "partner_age_check")?.available).toBe(true);
  });

  it("labels the sandbox economic demo as not age verification and not production-usable", () => {
    const pack = POLICY_PACKS.sandbox_economic_demo;
    const plan = planEligibilityMethods({ pack, privacyPreservingAvailable: true });
    expect(plan.disclosure.economic_demo).toBe(true);
    expect(plan.disclosure.not_age_verification).toBe(true);
    expect(plan.disclosure.sandbox_only).toBe(true);
    expect(plan.disclosure.disclosed_result).toBe("sandbox_demo_eligible");
    expect(pack.required_claims).not.toContain("identity_verified");
    expect(plan.methods.find((method) => method.id === "identity_liveness")?.available).toBe(false);
  });
});

describe("Circle settlement inadequate receipts", () => {
  it("rejects login-only, self-attestation, and production-misused demo receipts", () => {
    expect(isInadequateCircleSettlementReceipt({ evaluated_claim_refs: [] }).reason).toBe("account_login_or_empty_claims");
    expect(isInadequateCircleSettlementReceipt({
      evaluated_claim_refs: [{ claim_type: "self_attested_age_band", issuer_id: "issuer:abraxas-self-attest" }],
    }).inadequate).toBe(true);
    expect(isInadequateCircleSettlementReceipt({
      policy_id: "acme-sandbox_economic_demo-v1",
      production_usable: true,
      decision_context: "sandbox_only",
      evaluated_claim_refs: [{ claim_type: "product_eligibility", issuer_id: "issuer:abraxas-sandbox" }],
    }).reason).toBe("sandbox_demo_production");
    expect(isInadequateCircleSettlementReceipt({
      policy_id: "acme-sandbox_economic_demo-v1",
      production_usable: false,
      decision_context: "production",
      evaluated_claim_refs: [{ claim_type: "product_eligibility", issuer_id: "issuer:abraxas-sandbox" }],
    }).reason).toBe("sandbox_demo_not_sandbox_context");
    expect(isInadequateCircleSettlementReceipt({
      policy_id: "acme-sandbox_economic_demo-v1",
      production_usable: false,
      decision_context: "sandbox_only",
      evaluated_claim_refs: [{ claim_type: "product_eligibility", issuer_id: "issuer:abraxas-sandbox" }],
    }).inadequate).toBe(false);
  });
});
