// FILE: lib/partner/launchpad/bindingAwareEnforcement.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { ApplicationPolicyBindingRow } from "@/lib/partner/launchpad/applicationPolicyBindings";
import {
  assertReceiptMatchesBinding,
  bindingProductionAuthorized,
  materializeResolvedBinding,
  resolveBindingEnvironment,
} from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";

const app: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme",
  partner_id: "acme",
  application_name: "Acme",
  display_name: "Acme",
  environment: "production",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback"],
  api_key_id: "key-1",
  production_api_key_id: "prod-1",
  production_key_revealed_at: null,
  production_activated_at: "2026-01-01T00:00:00.000Z",
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const ageBinding: ApplicationPolicyBindingRow = {
  id: "b-age",
  application_id: app.id,
  partner_id: app.partner_id,
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  binding_role: "primary",
  status: "active",
  sandbox_configured_at: "2026-01-01T00:00:00.000Z",
  production_authorized_at: "2026-01-01T00:00:00.000Z",
};

const residencyBinding: ApplicationPolicyBindingRow = {
  id: "b-residency",
  application_id: app.id,
  partner_id: app.partner_id,
  policy_id: "acme-residency_us-v1",
  policy_version: 1,
  policy_template_id: "residency_us",
  binding_role: "secondary",
  status: "active",
  sandbox_configured_at: "2026-01-02T00:00:00.000Z",
  production_authorized_at: null,
};

vi.mock("@/lib/partner/launchpad/applicationPolicyBindings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/applicationPolicyBindings")>(
    "@/lib/partner/launchpad/applicationPolicyBindings",
  );
  return {
    ...actual,
    listApplicationPolicyBindings: vi.fn(async () => [ageBinding, residencyBinding]),
  };
});

import { resolveApplicationPolicyBinding } from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";

describe("binding resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves primary production binding", () => {
    const resolved = materializeResolvedBinding({ binding: ageBinding, application: app });
    expect(resolved?.pack_id).toBe("age_21_retail");
    expect(resolved?.result_family).toBe("age_eligible_21");
    expect(resolveBindingEnvironment({ binding: ageBinding, application: app })).toBe("production");
    expect(bindingProductionAuthorized({ binding: ageBinding, application: app })).toBe(true);
  });

  it("keeps secondary binding sandbox-only on production app", () => {
    const resolved = materializeResolvedBinding({ binding: residencyBinding, application: app });
    expect(resolved?.environment).toBe("sandbox");
    expect(bindingProductionAuthorized({ binding: residencyBinding, application: app })).toBe(false);
  });

  it("requires binding selection when multiple bindings exist", async () => {
    const ambiguous = await resolveApplicationPolicyBinding({
      application: app,
      partnerId: app.partner_id,
    });
    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) expect(ambiguous.code).toBe("AMBIGUOUS_POLICY_BINDING");
  });

  it("resolves explicit binding by id", async () => {
    const resolved = await resolveApplicationPolicyBinding({
      application: app,
      partnerId: app.partner_id,
      bindingId: "b-residency",
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.binding.pack_id).toBe("residency_us");
      expect(resolved.binding.result_family).toBe(POLICY_PACKS.residency_us.disclosed_result);
    }
  });

  it("rejects production request for sandbox-only secondary binding", async () => {
    const denied = await resolveApplicationPolicyBinding({
      application: app,
      partnerId: app.partner_id,
      bindingId: "b-residency",
      requestedEnvironment: "production",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("PRODUCTION_BINDING_NOT_AUTHORIZED");
  });
});

describe("verifyForAction binding enforcement", () => {
  const ageReceipt = {
    receipt_id: "dr_age",
    schema_version: "1.0.0",
    artifact_type: "eligibility_decision_receipt",
    partner_id: "acme",
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: true,
    currently_valid: true,
    decision_context: "production" as const,
    invalidation_reasons: [] as string[],
  };

  const residencyReceipt = {
    ...ageReceipt,
    receipt_id: "dr_residency",
    policy_id: "acme-residency_us-v1",
  };

  it("permits receipt matching age binding", async () => {
    const binding = materializeResolvedBinding({ binding: ageBinding, application: app })!;
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: binding.policy_id,
      policyVersion: 1,
      environment: "production",
      bindingId: binding.binding_id,
      policyPackId: binding.pack_id,
      resultFamily: binding.result_family,
      fetchFn: async () => new Response(JSON.stringify(ageReceipt), { status: 200 }),
    });
    const result = await kit.verifyForAction({
      receiptId: "dr_age",
      binding,
    });
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
    expect(permitProtocolAction(result)).toBe(true);
  });

  it("denies age receipt for residency binding", async () => {
    const binding = materializeResolvedBinding({ binding: residencyBinding, application: app })!;
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: binding.policy_id,
      policyVersion: 1,
      environment: "sandbox",
      bindingId: binding.binding_id,
      policyPackId: binding.pack_id,
      resultFamily: binding.result_family,
      fetchFn: async () => new Response(JSON.stringify(ageReceipt), { status: 200 }),
    });
    const result = await kit.verifyForAction({
      receiptId: "dr_age",
      binding,
    });
    expect(permitProtocolAction(result)).toBe(false);
    expect(result.errors.some((e) => e.includes("RECEIPT_POLICY_MISMATCH") || e.includes("wrong_policy"))).toBe(true);
  });

  it("assertReceiptMatchesBinding catches policy mismatch", () => {
    const binding = materializeResolvedBinding({ binding: residencyBinding, application: app })!;
    const errors = assertReceiptMatchesBinding({
      binding,
      receiptPolicyId: ageReceipt.policy_id,
      receiptPolicyVersion: 1,
      receiptPartnerId: "acme",
    });
    expect(errors).toContain("RECEIPT_POLICY_MISMATCH");
  });

  it("rejects wrong partner binding tenant", async () => {
    const denied = await resolveApplicationPolicyBinding({
      application: app,
      partnerId: "other-partner",
      bindingId: "b-age",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("POLICY_BINDING_TENANT_MISMATCH");
  });

  it("rejects inactive binding", async () => {
    const { listApplicationPolicyBindings } = await import("@/lib/partner/launchpad/applicationPolicyBindings");
    vi.mocked(listApplicationPolicyBindings).mockResolvedValueOnce([
      { ...ageBinding, status: "retired" },
      residencyBinding,
    ]);
    const denied = await resolveApplicationPolicyBinding({
      application: app,
      partnerId: app.partner_id,
      bindingId: "b-age",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("POLICY_BINDING_NOT_FOUND");
  });

  it("detects result family mismatch via pack pin", async () => {
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      policyVersion: 1,
      environment: "sandbox",
      policyPackId: "residency_us",
      resultFamily: POLICY_PACKS.residency_us.disclosed_result,
      fetchFn: async () => new Response(JSON.stringify(ageReceipt), { status: 200 }),
    });
    const result = await kit.verifyForAction({
      receiptId: "dr_age",
      expectedPackId: "residency_us",
      expectedResultFamily: POLICY_PACKS.residency_us.disclosed_result,
    });
    expect(permitProtocolAction(result)).toBe(false);
    expect(result.errors.some((e) => e.includes("RECEIPT") || e.includes("wrong_policy"))).toBe(true);
  });

  it("denies sandbox binding for production action", async () => {
    const binding = materializeResolvedBinding({ binding: residencyBinding, application: app })!;
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: binding.policy_id,
      policyVersion: 1,
      environment: "production",
      bindingId: binding.binding_id,
      fetchFn: async () => new Response(JSON.stringify({
        ...ageReceipt,
        policy_id: binding.policy_id,
        production_usable: false,
      }), { status: 200 }),
    });
    const result = await kit.verifyForAction({
      receiptId: "dr_residency",
      binding,
      expectedEnvironment: "production",
    });
    expect(permitProtocolAction(result)).toBe(false);
  });
});

describe("starter kit binding pin", () => {
  it("embeds binding contract in generated files", () => {
    const binding = materializeResolvedBinding({ binding: ageBinding, application: app })!;
    const pin = {
      application_id: binding.application_id,
      binding_id: binding.binding_id,
      partner_id: binding.partner_id,
      policy_id: binding.policy_id,
      policy_version: binding.policy_version,
      pack_id: binding.pack_id,
      result_family: binding.result_family,
      environment: binding.environment,
      policy_label: "Age 21+",
    };
    const validated = validateStarterKitInput({
      pack_id: binding.pack_id,
      path: "hosted_partner_flow",
      platform: "universal_https",
      capabilities: [],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit({ ...validated.selection, binding_pin: pin });
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    const readme = kit.files.find((f) => f.path === "README.md");
    expect(readme?.contents).toContain(binding.binding_id);
    expect(readme?.contents).toContain(binding.result_family);
    const env = kit.files.find((f) => f.path === ".env.example");
    expect(env?.contents).toContain(`ABRAXAS_BINDING_ID=${binding.binding_id}`);
  });
});
