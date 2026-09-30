// FILE: lib/partner/launchpad/multiPolicy.test.ts

import { describe, expect, it } from "vitest";
import { POLICY_PACKS, POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";
import {
  applicationProductionAuthorized,
  buildPolicyPresentation,
  buildPolicyPresentationFromPolicyId,
  resolveBindingAvailability,
} from "@/lib/partner/launchpad/policyPresentation";
import { CANONICAL_POLICY_PACK_REGISTRY } from "@/lib/partner/launchpad/policyTruth";
import { resolveMultiPolicyNextAction } from "@/lib/partner/launchpad/multiPolicyNextAction";
import type { ApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";

describe("canonical policy presentation", () => {
  it("derives human labels from pack registry without changing IDs", () => {
    const age = buildPolicyPresentation(POLICY_PACKS.age_21_retail);
    expect(age.title).toBe("Age 21 eligibility");
    expect(age.pack_id).toBe("age_21_retail");
    expect(age.disclosed_result).toBe("age_eligible_21");
    expect(age.withheld).toContain("date of birth");

    const residency = buildPolicyPresentation(POLICY_PACKS.residency_us);
    expect(residency.title).toMatch(/residency/i);
    expect(residency.pack_id).toBe("residency_us");
    expect(residency.withheld.join(" ").toLowerCase()).toContain("street address");
  });

  it("documents single canonical registry source", () => {
    expect(CANONICAL_POLICY_PACK_REGISTRY).toContain("policyPacks.ts");
    expect(POLICY_PACK_LIST.length).toBeGreaterThan(0);
  });

  it("maps policy IDs to presentations without duplicate registry", () => {
    const fromId = buildPolicyPresentationFromPolicyId("partner_acme_age_21_retail", "age_21_retail");
    expect(fromId?.pack_id).toBe("age_21_retail");
  });
});

describe("production eligibility vs application authorization", () => {
  it("separates global production eligibility from app authorization", () => {
    const pack = POLICY_PACKS.age_21_retail;
    expect(applicationProductionAuthorized({
      bindingRole: "primary",
      applicationProductionActive: true,
      pack,
    })).toBe(true);
    expect(applicationProductionAuthorized({
      bindingRole: "secondary",
      applicationProductionActive: true,
      pack,
    })).toBe(false);
  });

  it("represents sandbox-only packs correctly", () => {
    const pack = POLICY_PACKS.sandbox_economic_demo;
    expect(resolveBindingAvailability({
      configured: false,
      pack,
      bindingRole: "secondary",
      applicationEnvironment: "sandbox",
      applicationProductionActive: false,
    })).toBe("sandbox_only");
  });
});

describe("privacy disclosure by policy", () => {
  it("withholds DOB for age and address categories for residency", () => {
    const age = buildPolicyPresentation(POLICY_PACKS.age_21_retail);
    expect(age.partner_does_not_receive.join(" ").toLowerCase()).toContain("date of birth");
    expect(age.partner_receives).toContain("age_eligible_21");

    const residency = buildPolicyPresentation(POLICY_PACKS.residency_us);
    expect(residency.disclosed_result).not.toBe("age_eligible_21");
    expect(residency.partner_does_not_receive.length).toBeGreaterThan(0);
  });
});

describe("receipt isolation", () => {
  it("pins distinct result families per policy", () => {
    expect(POLICY_PACKS.age_21_retail.disclosed_result).toBe("age_eligible_21");
    expect(POLICY_PACKS.residency_us.disclosed_result).not.toBe("age_eligible_21");
    expect(POLICY_PACKS.age_21_retail.receipt_claim).not.toBe(POLICY_PACKS.residency_us.receipt_claim);
  });
});

describe("multi-policy next actions", () => {
  function summary(partial: Partial<ApplicationPoliciesSummary>): ApplicationPoliciesSummary {
    return {
      application_id: "app-1",
      configured_count: 1,
      production_active_count: 0,
      sandbox_count: 1,
      policy_expansion_observed: false,
      initial_policy_template_id: "age_21_retail",
      bindings: [],
      available_to_add: [],
      notice: "",
      ...partial,
    };
  }

  it("suggests configure first when empty", () => {
    expect(resolveMultiPolicyNextAction(summary({ configured_count: 0 }))).toBe("configure_first_policy");
  });

  it("suggests connect website before test when connection is incomplete", () => {
    const ageBinding = buildPolicyPresentation(POLICY_PACKS.age_21_retail);
    expect(resolveMultiPolicyNextAction(summary({
      bindings: [{
        ...ageBinding,
        binding_id: "b1",
        policy_id: "p1",
        policy_version: 1,
        binding_role: "primary",
        configured: true,
        availability: "configured",
        application_environment: "sandbox",
        application_production_active: false,
        application_production_authorized: false,
        compatibility_hint: "reusable_available",
        request_volume: 1,
        verified_receipts: 0,
        evidence_reuse_count: 0,
      }],
      available_to_add: [buildPolicyPresentation(POLICY_PACKS.residency_us)],
    }), { connectionComplete: false })).toBe("connect_website");
  });

  it("suggests run test verification after connection is complete", () => {
    const ageBinding = buildPolicyPresentation(POLICY_PACKS.age_21_retail);
    expect(resolveMultiPolicyNextAction(summary({
      bindings: [{
        ...ageBinding,
        binding_id: "b1",
        policy_id: "p1",
        policy_version: 1,
        binding_role: "primary",
        configured: true,
        availability: "configured",
        application_environment: "sandbox",
        application_production_active: false,
        application_production_authorized: false,
        compatibility_hint: "reusable_available",
        request_volume: 1,
        verified_receipts: 0,
        evidence_reuse_count: 0,
      }],
      available_to_add: [buildPolicyPresentation(POLICY_PACKS.residency_us)],
    }), { connectionComplete: true })).toBe("run_test_verification");
  });
});
