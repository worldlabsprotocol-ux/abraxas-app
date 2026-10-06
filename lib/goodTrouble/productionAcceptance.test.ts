// FILE: lib/goodTrouble/productionAcceptance.test.ts
// Production acceptance contract for age_21_retail relying-party path (Good Trouble fixture).
// Protects the live pilot path without hardcoding Good Trouble into shared platform logic.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience/brief";
import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { ApplicationPolicyBindingRow } from "@/lib/partner/launchpad/applicationPolicyBindings";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  bindingProductionAuthorized,
  materializeResolvedBinding,
  resolveApplicationPolicyBinding,
} from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";
import {
  pilotPayloadLeaks,
  RELYING_PARTY_PILOT_FORBIDDEN_PARTNER_FIELDS,
} from "@/lib/demo/relyingPartyPilot";
import { privacyFactsForPack } from "@/lib/partner/pilotEvidence/privacyFacts";
import { buildPartnerFunnel } from "@/lib/partner/pilotEvidence/funnel";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";

const PARTNER_ID = "good-trouble";
const APP_ID = "11111111-1111-1111-1111-111111111111";
const POLICY_ID = buildLaunchpadPolicyId(PARTNER_ID, "age_21_retail");
const RESIDENCY_POLICY_ID = buildLaunchpadPolicyId(PARTNER_ID, "residency_us");

const productionApp: LaunchpadApplicationRow = {
  id: APP_ID,
  public_slug: "good-trouble",
  partner_id: PARTNER_ID,
  application_name: "Good Trouble",
  display_name: "Good Trouble",
  environment: "production",
  policy_id: POLICY_ID,
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://www.goodtroublecanna.com/age-verification-result"],
  api_key_id: "key-sandbox",
  production_api_key_id: "prod-key-1",
  production_key_revealed_at: null,
  production_activated_at: "2026-01-01T00:00:00.000Z",
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const ageBinding: ApplicationPolicyBindingRow = {
  id: "b-age",
  application_id: APP_ID,
  partner_id: PARTNER_ID,
  policy_id: POLICY_ID,
  policy_version: 1,
  policy_template_id: "age_21_retail",
  binding_role: "primary",
  status: "active",
  sandbox_configured_at: "2026-01-01T00:00:00.000Z",
  production_authorized_at: "2026-01-01T00:00:00.000Z",
  production_status: "production_active",
};

const residencyBinding: ApplicationPolicyBindingRow = {
  id: "b-residency",
  application_id: APP_ID,
  partner_id: PARTNER_ID,
  policy_id: RESIDENCY_POLICY_ID,
  policy_version: 1,
  policy_template_id: "residency_us",
  binding_role: "secondary",
  status: "active",
  sandbox_configured_at: "2026-01-02T00:00:00.000Z",
  production_authorized_at: null,
  production_status: "sandbox_only",
};

function productionAgeReceipt(overrides: Partial<PartnerFlowPublicReceipt> = {}): PartnerFlowPublicReceipt {
  return {
    receipt_id: "dr_gt_age",
    schema_version: "1.0.0",
    artifact_type: "eligibility_decision_receipt",
    partner_id: PARTNER_ID,
    policy_id: POLICY_ID,
    policy_version: 1,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: true,
    currently_valid: true,
    decision_context: "production",
    invalidation_reasons: [],
    ...overrides,
  } as PartnerFlowPublicReceipt;
}

vi.mock("@/lib/partner/launchpad/applicationPolicyBindings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/applicationPolicyBindings")>(
    "@/lib/partner/launchpad/applicationPolicyBindings",
  );
  return {
    ...actual,
    listApplicationPolicyBindings: vi.fn(async () => [ageBinding, residencyBinding]),
  };
});

describe("Good Trouble production acceptance — binding authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes age 21+ primary binding on production app", () => {
    expect(bindingProductionAuthorized({ binding: ageBinding, application: productionApp })).toBe(true);
  });

  it("does not authorize residency binding without explicit production approval", () => {
    expect(bindingProductionAuthorized({ binding: residencyBinding, application: productionApp })).toBe(false);
  });

  it("rejects production resolver for unauthorized secondary binding", async () => {
    const denied = await resolveApplicationPolicyBinding({
      application: productionApp,
      partnerId: PARTNER_ID,
      bindingId: "b-residency",
      requestedEnvironment: "production",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("PRODUCTION_BINDING_NOT_AUTHORIZED");
  });

  it("rejects another partner reading Good Trouble bindings", async () => {
    const denied = await resolveApplicationPolicyBinding({
      application: productionApp,
      partnerId: "other-partner",
      bindingId: "b-age",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("POLICY_BINDING_TENANT_MISMATCH");
  });

  it("rejects sandbox credential context for production binding", async () => {
    const sandboxApp = { ...productionApp, environment: "sandbox" as const, production_activated_at: null };
    const denied = await resolveApplicationPolicyBinding({
      application: sandboxApp,
      partnerId: PARTNER_ID,
      bindingId: "b-age",
      requestedEnvironment: "production",
    });
    expect(denied.ok).toBe(false);
  });
});

describe("Good Trouble production acceptance — holder disclosure", () => {
  const pack = POLICY_PACKS.age_21_retail;

  it("shows who is asking, why, and what is shared without DOB", () => {
    const brief = buildHolderRequestBrief({
      partnerId: PARTNER_ID,
      partnerName: "Good Trouble",
      policyId: POLICY_ID,
      purpose: "Confirm customer is 21 or older",
      environment: "production",
      disclosedResult: pack.disclosed_result,
      userExplanation: pack.holder_explanation,
    });
    expect(brief.requestor).toContain("Good Trouble");
    expect(brief.shared_result_category).toContain("age_eligible_21");
    expect(brief.withheld.join(" ").toLowerCase()).toMatch(/date of birth|government id/);
    expect(JSON.stringify(brief).toLowerCase()).not.toContain("1990-01-01");
  });

  it("documents privacy facts for age_21_retail pack", () => {
    const facts = privacyFactsForPack("age_21_retail");
    expect(facts.partner_receives).toEqual(["age_eligible_21"]);
    expect(facts.partner_does_not_receive).toContain("date of birth");
    expect(facts.partner_does_not_receive).toContain("government ID images");
  });
});

describe("Good Trouble production acceptance — server verification", () => {
  const ageResolved = materializeResolvedBinding({ binding: ageBinding, application: productionApp })!;

  function kitWithReceipt(receipt: PartnerFlowPublicReceipt) {
    return new AbraxasPartnerKit({
      partnerId: PARTNER_ID,
      policyId: POLICY_ID,
      policyVersion: 1,
      environment: "production",
      bindingId: ageBinding.id,
      policyPackId: "age_21_retail",
      resultFamily: "age_eligible_21",
      fetchFn: async () => new Response(JSON.stringify(receipt), { status: 200 }),
    });
  }

  it("permits correct production age receipt via verifyForAction", async () => {
    const result = await kitWithReceipt(productionAgeReceipt()).verifyForAction({
      receiptId: "dr_gt_age",
      binding: ageResolved,
    });
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
    expect(permitProtocolAction(result)).toBe(true);
  });

  it("denies wrong partner receipt", async () => {
    const result = await kitWithReceipt(productionAgeReceipt({ partner_id: "other-partner" })).verifyForAction({
      receiptId: "dr_gt_age",
      binding: ageResolved,
    });
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("denies wrong policy receipt for age binding", async () => {
    const result = await kitWithReceipt(productionAgeReceipt({ policy_id: RESIDENCY_POLICY_ID })).verifyForAction({
      receiptId: "dr_gt_age",
      binding: ageResolved,
    });
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("denies expired receipt", async () => {
    const result = await kitWithReceipt(productionAgeReceipt({
      expires_at: "2020-01-01T00:00:00.000Z",
      currently_valid: false,
    })).verifyForAction({
      receiptId: "dr_gt_age",
      binding: ageResolved,
    });
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("denies invalid signature", async () => {
    const result = await kitWithReceipt(productionAgeReceipt({ signature_valid: false })).verifyForAction({
      receiptId: "dr_gt_age",
      binding: ageResolved,
    });
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("denies sandbox receipt in production verification", async () => {
    const result = await kitWithReceipt(productionAgeReceipt({
      production_usable: false,
      decision_context: "sandbox_only",
    })).verifyForAction({
      receiptId: "dr_gt_age",
      binding: ageResolved,
      expectedEnvironment: "production",
    });
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("denies age receipt when verifying against residency binding", async () => {
    const residencyResolved = materializeResolvedBinding({ binding: residencyBinding, application: productionApp })!;
    const kit = new AbraxasPartnerKit({
      partnerId: PARTNER_ID,
      policyId: RESIDENCY_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
      bindingId: residencyBinding.id,
      policyPackId: "residency_us",
      resultFamily: POLICY_PACKS.residency_us.disclosed_result,
      fetchFn: async () => new Response(JSON.stringify(productionAgeReceipt()), { status: 200 }),
    });
    const result = await kit.verifyForAction({
      receiptId: "dr_gt_age",
      binding: residencyResolved,
    });
    expect(permitProtocolAction(result)).toBe(false);
  });
});

describe("Good Trouble production acceptance — privacy proof", () => {
  it("partner-visible verification surface excludes prohibited identity fields", () => {
    const partnerVisible = {
      result: "age_eligible_21",
      policy: POLICY_ID,
      policy_version: 1,
      partner_id: PARTNER_ID,
      receipt_id: "dr_gt_age",
      expires_at: "2099-01-01T00:00:00.000Z",
      currently_valid: true,
      signature_valid: true,
      status: "active",
    };
    expect(pilotPayloadLeaks(partnerVisible)).toEqual([]);
    for (const forbidden of RELYING_PARTY_PILOT_FORBIDDEN_PARTNER_FIELDS) {
      expect(JSON.stringify(partnerVisible).toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it("age pack partner_does_not_receive matches prohibited disclosure classes", () => {
    const pack = POLICY_PACKS.age_21_retail;
    expect(pack.partner_does_not_receive.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(["date of birth", "government id images"]),
    );
  });
});

describe("Good Trouble production acceptance — pilot evidence", () => {
  it("shows pending funnel stages when no production events exist", () => {
    const funnel = buildPartnerFunnel({
      application: productionApp,
      events: [],
      activity: [],
      environment: "production",
    });
    const firstProdRequest = funnel.find((s) => s.stage === "first_production_request");
    const firstVerification = funnel.find((s) => s.stage === "partner_verification_succeeded");
    expect(firstProdRequest?.status).toBe("pending");
    expect(firstProdRequest?.first_at).toBeNull();
    expect(firstVerification?.status).toBe("pending");
    expect(firstVerification?.first_at).toBeNull();
  });
});
