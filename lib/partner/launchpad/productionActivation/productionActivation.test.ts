import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  isApplicationProductionUsable,
  productionLifecycleImpliesLive,
  resolveProductionActivationLifecycle,
  resolveReceiptDecisionContext,
  PRODUCTION_ACTIVATION_RPC,
  LEGACY_PRODUCTION_APPROVAL_RPC,
} from "@/lib/partner/launchpad/productionActivation";
import {
  partnerKeyEnvironment,
  validatePartnerCredentialBoundary,
} from "@/lib/partner/productionIntegration/credentialBoundary";
import { evaluateProductionIntegrationReadiness } from "@/lib/partner/productionIntegration/productionReadiness";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    rpc: rpcMock,
    from: fromMock,
  }),
  SupabaseAdminConfigurationError: class extends Error {},
}));

vi.mock("@/lib/partner/launchpad/goLiveReadiness/load", () => ({
  loadGoLiveEvidence: vi.fn(async () => ({
    applicationId: "11111111-1111-1111-1111-111111111111",
    partnerId: "acme",
    status: "active",
    environment: "sandbox",
    policyId: "acme-age_21_retail-v1",
    policyVersion: 1,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: ["https://shop.acme.example/callback"],
    activeSandboxKey: true,
    webhookConfigured: false,
    webhookEnabled: false,
    latestDeliveryStatus: null,
    verifiedHostnames: ["shop.acme.example"],
    starterKitEvidenced: true,
    starterKitRuntime: "typescript_nextjs",
    request: { id: "req-1", status: "pending", created_at: "2026-01-01", reviewed_at: null },
  })),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: vi.fn(async () => APP),
}));

vi.mock("@/lib/policy/changeControl/schemaReady", () => ({
  probePolicyChangeControlSchema: vi.fn(async () => ({ ready: true })),
}));

vi.mock("@/lib/partner/launchpad/productionReview/evaluate", () => ({
  evaluateProductionReviewGates: vi.fn(() => ({
    ok: true,
    blockers: [],
    readiness_class: "ready_to_request_review",
    policy_compatibility: "available",
    webhook_health_class: "not_configured",
    test_console_class: "pass",
    network_postures: [],
    selected_capabilities: [],
    issues_production_key: false,
    activates_mainnet: false,
    executes: false,
  })),
}));

vi.mock("@/lib/partner/launchpad/productionKeyEnvelope", () => ({
  encryptProductionKeyForReveal: vi.fn(() => "encrypted"),
}));

import { activateProductionApplication } from "./activate";

const APP: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme-retail",
  partner_id: "acme",
  application_name: "Acme retail",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://shop.acme.example/callback"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_key_revealed_at: null,
  production_activated_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

function evidence(overrides: Partial<GoLiveEvidence> = {}): GoLiveEvidence {
  return {
    applicationId: APP.id,
    partnerId: APP.partner_id,
    status: "active",
    environment: "production",
    policyId: APP.policy_id,
    policyVersion: APP.policy_version,
    policyTemplateId: APP.policy_template_id,
    allowedReturnUrls: APP.allowed_return_urls,
    activeSandboxKey: true,
    webhookConfigured: false,
    webhookEnabled: false,
    latestDeliveryStatus: null,
    verifiedHostnames: ["shop.acme.example"],
    starterKitEvidenced: true,
    starterKitRuntime: "typescript_nextjs",
    request: { id: "req-1", status: "approved", created_at: "2026-01-01", reviewed_at: "2026-01-02" },
    ...overrides,
  };
}

describe("migration 110 canonical RPC", () => {
  it("defines partner_launchpad_activate_production_atomic", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/110_partner_launchpad_activate_production_atomic.sql"),
      "utf8",
    );
    expect(sql).toContain(PRODUCTION_ACTIVATION_RPC);
    expect(sql).toContain("production_activated_at");
    expect(sql).toContain("production_application_activated");
  });
});

describe("go-live lifecycle", () => {
  it("maps activated apps to production_active", () => {
    expect(resolveProductionActivationLifecycle({
      application: {
        environment: "production",
        status: "active",
        production_activated_at: "2026-01-02T00:00:00.000Z",
        production_api_key_id: "live-1",
      },
      requestStatus: "approved",
    })).toBe("production_active");
  });

  it("does not imply live when credential revoked", () => {
    expect(productionLifecycleImpliesLive(resolveProductionActivationLifecycle({
      application: {
        environment: "production",
        status: "active",
        production_activated_at: "2026-01-02T00:00:00.000Z",
        production_api_key_id: "live-1",
      },
      requestStatus: "approved",
      productionKeyRevoked: true,
    }))).toBe(false);
  });
});

describe("resolveReceiptDecisionContext", () => {
  beforeEach(() => {
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          production_activated_at: "2026-01-02T00:00:00.000Z",
          environment: "production",
          status: "active",
        },
      }),
    });
  });

  it("returns production for activated app even when policy pack is sandbox-only", async () => {
    await expect(resolveReceiptDecisionContext({
      policySandboxOnly: true,
      launchpadApplicationId: APP.id,
    })).resolves.toBe("production");
  });

  it("returns sandbox_only without activation context", async () => {
    await expect(resolveReceiptDecisionContext({
      policySandboxOnly: true,
      launchpadApplicationId: null,
    })).resolves.toBe("sandbox_only");
  });
});

describe("credential boundary enforcement", () => {
  it("rejects test key on production route", () => {
    const result = validatePartnerCredentialBoundary({
      credential: {
        keyPrefix: "abx_test_abc12345",
        partnerId: "acme",
        apiKeyId: "k1",
        revoked: false,
        launchpadApplicationId: APP.id,
      },
      expectedEnvironment: "production",
      expectedPartnerId: "acme",
      expectedApplicationId: APP.id,
      applicationStatus: "active",
      productionAccessApproved: true,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors).toContain("credential_wrong_environment");
  });

  it("rejects live key for wrong application", () => {
    const result = validatePartnerCredentialBoundary({
      credential: {
        keyPrefix: "abx_live_abc12345",
        partnerId: "acme",
        apiKeyId: "k1",
        revoked: false,
        launchpadApplicationId: "other-app",
      },
      expectedEnvironment: "production",
      expectedPartnerId: "acme",
      expectedApplicationId: APP.id,
      applicationStatus: "active",
      productionAccessApproved: true,
    });
    expect(result.ok).toBe(false);
  });
});

describe("activateProductionApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ error: null, count: 0 }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      if (table === "partner_production_access_requests") {
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: "req-1",
            application_id: APP.id,
            partner_id: "acme",
            status: "pending",
            request_notes: null,
            created_at: "2026-01-01",
            reviewed_at: null,
          },
          error: null,
        });
      }
      if (table === "partner_launchpad_applications") {
        chain.update = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        });
      }
      return chain;
    });
    rpcMock.mockImplementation(async (name: string) => {
      if (name === PRODUCTION_ACTIVATION_RPC) {
        return {
          data: {
            ok: true,
            code: "activated",
            request_id: "req-1",
            application_id: APP.id,
            partner_id: "acme",
            api_key_id: "live-1",
            key_prefix: "abx_live_abc12345",
            credential_state: "active",
            environment: "production",
            production_activated_at: "2026-01-02T00:00:00.000Z",
            policy_id: APP.policy_id,
            policy_version: APP.policy_version,
            issues_production_key: true,
          },
          error: null,
        };
      }
      return { data: { ok: false, code: "not_found" }, error: null };
    });
  });

  it("uses canonical RPC not legacy 085", async () => {
    const result = await activateProductionApplication({ requestId: "req-1", confirm: true });
    expect(result.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith(PRODUCTION_ACTIVATION_RPC, expect.any(Object));
    expect(rpcMock).not.toHaveBeenCalledWith(LEGACY_PRODUCTION_APPROVAL_RPC, expect.any(Object));
  });

  it("is idempotent on replay", async () => {
    rpcMock.mockImplementation(async (name: string) => {
      if (name === PRODUCTION_ACTIVATION_RPC) {
        return {
          data: {
            ok: true,
            code: "idempotency_replay",
            request_id: "req-1",
            application_id: APP.id,
            partner_id: "acme",
            api_key_id: "live-1",
            key_prefix: "abx_live_abc12345",
            credential_state: "active",
            environment: "production",
            production_activated_at: "2026-01-02T00:00:00.000Z",
            issues_production_key: false,
          },
          error: null,
        };
      }
      return { data: { ok: false, code: "not_found" }, error: null };
    });
    const result = await activateProductionApplication({ requestId: "req-1", confirm: true });
    expect(result.ok).toBe(true);
    expect(result.idempotency_replay).toBe(true);
    expect(result.issues_production_key).toBe(false);
  });
});

describe("production readiness uses activation state", () => {
  it("blocks before activation", async () => {
    const readiness = await evaluateProductionIntegrationReadiness({
      application: APP,
      evidence: evidence({ environment: "sandbox", request: { id: "req-1", status: "pending", created_at: "2026-01-01", reviewed_at: null } }),
    });
    expect(readiness.ok).toBe(false);
    expect(readiness.blockers).toContain("production_access_not_approved");
    expect(readiness.blockers).toContain("sandbox_only_policy");
  });

  it("passes when activated and configured", async () => {
    const activated: LaunchpadApplicationRow = {
      ...APP,
      environment: "production",
      production_api_key_id: "live-1",
      production_activated_at: "2026-01-02T00:00:00.000Z",
    };
    const readiness = await evaluateProductionIntegrationReadiness({
      application: activated,
      evidence: evidence(),
      schemaReady: true,
    });
    expect(readiness.blockers).not.toContain("sandbox_only_policy");
    expect(readiness.blockers).not.toContain("production_access_not_approved");
  });
});
