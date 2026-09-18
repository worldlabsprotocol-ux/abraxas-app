import { describe, expect, it } from "vitest";
import type { ClaimType } from "@/lib/credentials/claimSchema";
import {
  GOOGLE_ACCOUNT_NOT_ELIGIBILITY,
  POLICY_PACK_CATALOG_VERSION,
  POLICY_PACK_FORBIDDEN_GUARANTEES,
  POLICY_PACK_LIST,
  POLICY_PACKS,
  policyPackIsSandboxOnly,
  resolvePolicyPack,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";

const ALLOWED_CLAIMS = new Set<ClaimType>([
  "identity_verified",
  "liveness_passed",
  "residency_country",
  "wallet_binding_confirmed",
  "product_eligibility",
]);

const REQUIRED_PACK_IDS: PolicyPackId[] = [
  "age_18_retail",
  "age_21_retail",
  "residency_us",
  "wallet_control",
  "membership_credential",
  "collector_redemption",
  "identity_liveness",
];

describe("policy packs catalog", () => {
  it("exposes exactly the seven reusable packs", () => {
    expect(POLICY_PACK_LIST.map((pack) => pack.id).sort()).toEqual([...REQUIRED_PACK_IDS].sort());
    expect(POLICY_PACK_CATALOG_VERSION).toBe(1);
  });

  it("defines required metadata for every pack", () => {
    for (const pack of POLICY_PACK_LIST) {
      expect(pack.display_name.length).toBeGreaterThan(8);
      expect(pack.holder_explanation.length).toBeGreaterThan(20);
      expect(pack.required_claims.length).toBeGreaterThan(0);
      expect(pack.minimum_assurance).toMatch(/^L[0-4]$/);
      expect(pack.receipt_lifetime_hours).toBeGreaterThan(0);
      expect(pack.intended_use_examples.length).toBeGreaterThan(0);
      expect(pack.partner_receives.length).toBeGreaterThan(10);
      expect(pack.partner_does_not_receive.length).toBeGreaterThan(0);
      expect(pack.disclosed_result.length).toBeGreaterThan(4);
      expect(["sandbox_only", "production_eligible_after_safety_gate"]).toContain(pack.production_suitability);
      expect(pack.rules.sandbox_only).toBe(true);
      expect(pack.rules.account_required).toBe(true);
      expect(pack.rules.consent_required).toBe(true);
      for (const claim of pack.required_claims) {
        expect(ALLOWED_CLAIMS.has(claim)).toBe(true);
      }
    }
  });

  it("does not claim legal, gambling, KYC, sanctions, or accredited-investor guarantees", () => {
    const blob = JSON.stringify(POLICY_PACKS).toLowerCase();
    for (const term of POLICY_PACK_FORBIDDEN_GUARANTEES) {
      expect(blob).not.toContain(term);
    }
    expect(GOOGLE_ACCOUNT_NOT_ELIGIBILITY.toLowerCase()).toContain("does not prove");
  });

  it("marks collector redemption sandbox-only and age packs production-eligible after the safety gate", () => {
    expect(policyPackIsSandboxOnly(POLICY_PACKS.collector_redemption)).toBe(true);
    expect(policyPackIsSandboxOnly(POLICY_PACKS.age_18_retail)).toBe(false);
    expect(policyPackIsSandboxOnly(POLICY_PACKS.identity_liveness)).toBe(false);
  });

  it("rejects unknown pack ids and custom_sandbox", () => {
    expect(resolvePolicyPack("executable_partner_code")).toBeNull();
    expect(resolvePolicyPack("custom_sandbox")).toBeNull();
  });
});
