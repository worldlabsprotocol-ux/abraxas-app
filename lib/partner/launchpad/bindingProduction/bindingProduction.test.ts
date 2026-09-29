// FILE: lib/partner/launchpad/bindingProduction/bindingProduction.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { ApplicationPolicyBindingRow } from "@/lib/partner/launchpad/applicationPolicyBindings";
import {
  bindingProductionAuthorized,
  materializeResolvedBinding,
  resolveApplicationPolicyBinding,
} from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";
import { applicationProductionAuthorized } from "@/lib/partner/launchpad/policyPresentation";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import {
  bindingProductionPartnerNextAction,
  evaluateBindingProductionReadiness,
} from "./evaluate";

const productionApp: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "good-trouble",
  partner_id: "good-trouble",
  application_name: "Good Trouble",
  display_name: "Good Trouble",
  environment: "production",
  policy_id: "good-trouble-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://example.com/callback"],
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
  application_id: productionApp.id,
  partner_id: productionApp.partner_id,
  policy_id: "good-trouble-age_21_retail-v1",
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
  application_id: productionApp.id,
  partner_id: productionApp.partner_id,
  policy_id: "good-trouble-residency_us-v1",
  policy_version: 1,
  policy_template_id: "residency_us",
  binding_role: "secondary",
  status: "active",
  sandbox_configured_at: "2026-01-02T00:00:00.000Z",
  production_authorized_at: null,
  production_status: "sandbox_only",
};

describe("binding production authorization model", () => {
  it("authorizes primary binding when application production is active", () => {
    expect(bindingProductionAuthorized({ binding: ageBinding, application: productionApp })).toBe(true);
    expect(applicationProductionAuthorized({
      bindingRole: "primary",
      applicationProductionActive: true,
      pack: POLICY_PACKS.age_21_retail,
      productionStatus: "production_active",
      productionAuthorizedAt: ageBinding.production_authorized_at,
    })).toBe(true);
  });

  it("does not authorize secondary binding without explicit production approval", () => {
    expect(bindingProductionAuthorized({ binding: residencyBinding, application: productionApp })).toBe(false);
    const resolved = materializeResolvedBinding({ binding: residencyBinding, application: productionApp });
    expect(resolved?.environment).toBe("sandbox");
    expect(resolved?.production_authorized).toBe(false);
  });

  it("authorizes secondary binding only after production_active status", () => {
    const authorized = {
      ...residencyBinding,
      production_authorized_at: "2026-02-01T00:00:00.000Z",
      production_status: "production_active" as const,
    };
    expect(bindingProductionAuthorized({ binding: authorized, application: productionApp })).toBe(true);
    const resolved = materializeResolvedBinding({ binding: authorized, application: productionApp });
    expect(resolved?.environment).toBe("production");
  });

  it("blocks suspended binding from production authorization", () => {
    const suspended = {
      ...residencyBinding,
      production_authorized_at: "2026-02-01T00:00:00.000Z",
      production_status: "production_suspended" as const,
    };
    expect(bindingProductionAuthorized({ binding: suspended, application: productionApp })).toBe(false);
  });

  it("primary production approval does not authorize secondary binding", () => {
    expect(bindingProductionAuthorized({ binding: ageBinding, application: productionApp })).toBe(true);
    expect(bindingProductionAuthorized({ binding: residencyBinding, application: productionApp })).toBe(false);
  });

  it("surfaces request action for secondary sandbox binding on production app", () => {
    expect(bindingProductionPartnerNextAction({
      productionStatus: "sandbox_only",
      canRequest: true,
      applicationProductionActive: true,
    })).toBe("request_binding_production");
  });

  it("requires application production before secondary request readiness", () => {
    const sandboxApp = { ...productionApp, environment: "sandbox" as const, production_activated_at: null };
    const readiness = evaluateBindingProductionReadiness({
      application: sandboxApp,
      binding: residencyBinding,
      evidence: {
        applicationId: sandboxApp.id,
        partnerId: sandboxApp.partner_id,
        status: sandboxApp.status,
        environment: sandboxApp.environment,
        policyId: sandboxApp.policy_id,
        policyVersion: sandboxApp.policy_version,
        policyTemplateId: sandboxApp.policy_template_id,
        allowedReturnUrls: sandboxApp.allowed_return_urls ?? [],
        activeSandboxKey: true,
        starterKitEvidenced: true,
        starterKitRuntime: null,
        webhookConfigured: false,
        webhookEnabled: false,
        latestDeliveryStatus: null,
        verifiedHostnames: [],
        request: null,
      },
      productionStatus: "sandbox_only",
      hasPendingRequest: false,
      policyEventsForBinding: { verified_receipts: 1, request_volume: 1 },
    });
    expect(readiness.ok).toBe(false);
    expect(readiness.blockers).toContain("application_production_not_active");
  });
});

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

describe("resolveApplicationPolicyBinding production gates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects production environment for unauthorized secondary binding", async () => {
    const denied = await resolveApplicationPolicyBinding({
      application: productionApp,
      partnerId: productionApp.partner_id,
      bindingId: "b-residency",
      requestedEnvironment: "production",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("PRODUCTION_BINDING_NOT_AUTHORIZED");
  });

  it("allows production environment for authorized secondary binding", async () => {
    const authorizedResidency = {
      ...residencyBinding,
      production_authorized_at: "2026-02-01T00:00:00.000Z",
      production_status: "production_active" as const,
    };
    const { listApplicationPolicyBindings } = await import("@/lib/partner/launchpad/applicationPolicyBindings");
    vi.mocked(listApplicationPolicyBindings).mockResolvedValueOnce([ageBinding, authorizedResidency]);
    const allowed = await resolveApplicationPolicyBinding({
      application: productionApp,
      partnerId: productionApp.partner_id,
      bindingId: "b-residency",
      requestedEnvironment: "production",
    });
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.binding.environment).toBe("production");
  });
});
