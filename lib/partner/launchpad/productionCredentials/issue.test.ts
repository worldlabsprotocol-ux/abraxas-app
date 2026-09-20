// FILE: lib/partner/launchpad/productionCredentials/issue.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";

const fromMock = vi.fn();
const rpcMock = vi.fn();
const getAppMock = vi.fn();
const loadEvidenceMock = vi.fn();
const probeMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  }),
  SupabaseAdminConfigurationError: class extends Error { code = "supabase_admin_not_configured"; },
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));

vi.mock("@/lib/partner/launchpad/goLiveReadiness/load", () => ({
  loadGoLiveEvidence: (...args: unknown[]) => loadEvidenceMock(...args),
}));

vi.mock("@/lib/policy/changeControl/schemaReady", () => ({
  probePolicyChangeControlSchema: (...args: unknown[]) => probeMock(...args),
}));

import { loadProductionCredentialStatus, operateProductionCredential } from "./issue";

const application: LaunchpadApplicationRow = {
  id: "app-1",
  public_slug: "acme-app",
  partner_id: "acme",
  application_name: "Acme sandbox",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["https://partner.example/callback"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const evidence: GoLiveEvidence = {
  applicationId: "app-1",
  partnerId: "acme",
  status: "active",
  environment: "sandbox",
  policyId: "acme-age_21_retail-v1",
  policyVersion: 1,
  policyTemplateId: "age_21_retail",
  allowedReturnUrls: ["https://partner.example/callback"],
  activeSandboxKey: true,
  webhookConfigured: true,
  webhookEnabled: true,
  latestDeliveryStatus: "delivered",
  verifiedHostnames: ["partner.example"],
  starterKitEvidenced: true,
  starterKitRuntime: "nextjs",
  request: { id: "req-1", status: "approved", created_at: "t", reviewed_at: "t2" },
};

let requestStatus = "approved";
let storeDown = false;
let rpcPayload: Record<string, unknown> = {};
let liveKey: { id: string; revoked_at: string | null; key_prefix: string } | null = null;

function chainFor(table: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.limit = async () => ({ error: storeDown ? { message: "down" } : null });
  chain.maybeSingle = async () => {
    if (storeDown) return { data: null, error: { message: "down" } };
    if (table === "partner_production_access_requests") {
      return {
        data: {
          id: "req-1",
          application_id: "app-1",
          partner_id: "acme",
          status: requestStatus,
          request_notes: null,
          created_at: "t",
          reviewed_at: "t2",
        },
        error: null,
      };
    }
    return { data: liveKey, error: null };
  };
  return chain;
}

describe("operateProductionCredential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestStatus = "approved";
    storeDown = false;
    liveKey = null;
    rpcPayload = {
      ok: true,
      code: "issued",
      action: "issue",
      credential_state: "active",
      key_prefix: "abx_live_xxxxxxx",
      request_id: "req-1",
      application_id: "app-1",
      activates_mainnet: false,
      executes: false,
      environment_changed: false,
    };
    fromMock.mockImplementation((table: string) => chainFor(table));
    rpcMock.mockResolvedValue({ data: rpcPayload, error: null });
    getAppMock.mockResolvedValue({ ...application });
    loadEvidenceMock.mockResolvedValue(evidence);
    probeMock.mockResolvedValue({ ready: true });
  });

  it("requires explicit confirmation and never issues on a status read", async () => {
    const denied = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: false });
    expect(denied).toMatchObject({ ok: false, code: "confirmation_required", activates_mainnet: false, executes: false });
    const status = await loadProductionCredentialStatus("req-1");
    expect(status).not.toHaveProperty("api_key");
    expect(JSON.stringify(status)).not.toMatch(/abx_live_[A-Za-z0-9_-]{12,}/);
    expect(rpcMock.mock.calls.some((call) => call[1]?.p_action === "issue")).toBe(false);
  });

  it("denies pending reviews before calling the write RPC", async () => {
    requestStatus = "pending";
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result.code).toBe("review_not_approved");
    expect(rpcMock.mock.calls.filter((call) => call[1]?.p_action === "issue")).toHaveLength(0);
  });

  it("fails closed when the atomic RPC is missing", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "Could not find the function public.partner_launchpad_operate_production_credential_atomic" } });
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result).toMatchObject({ ok: false, code: "production_credential_store_unavailable", credential_state: "unavailable" });
  });

  it("isolates tenants so the wrong partner app cannot mint a live key", async () => {
    getAppMock.mockResolvedValue(null);
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result).toMatchObject({ ok: false, code: "not_found" });
    expect(rpcMock.mock.calls.filter((call) => call[1]?.p_action === "issue")).toHaveLength(0);
  });

  it("returns the raw key only when the durable RPC reports issued", async () => {
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result.ok).toBe(true);
    expect(result.api_key?.startsWith("abx_live_")).toBe(true);
    expect(result.activates_mainnet).toBe(false);
    expect(result.environment_changed).toBe(false);
    const write = rpcMock.mock.calls.find((call) => call[1]?.p_action === "issue");
    expect(write?.[1]?.p_key_prefix).toMatch(/^abx_live_/);
    expect(write?.[1]?.p_key_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never reveals a raw key on already_issued", async () => {
    rpcMock.mockImplementation(async (_name: string, args: { p_action?: string }) => {
      if (args?.p_action === "revoke" && !args.p_key_prefix) return { data: { ok: false, code: "not_found" }, error: null };
      return {
        data: { ok: false, code: "already_issued", credential_state: "active", activates_mainnet: false, executes: false, environment_changed: false },
        error: null,
      };
    });
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result).toMatchObject({ ok: false, code: "already_issued" });
    expect(result.api_key).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/abx_live_[A-Za-z0-9_-]{12,}/);
  });

  it("attaches a one-time raw key only after a successful rotate RPC", async () => {
    rpcMock.mockImplementation(async (_name: string, args: { p_action?: string }) => {
      if (args?.p_action === "rotate") {
        return {
          data: {
            ok: true,
            code: "rotated",
            action: "rotate",
            credential_state: "rotating",
            key_prefix: args.p_key_prefix,
            activates_mainnet: false,
            executes: false,
            environment_changed: false,
          },
          error: null,
        };
      }
      return { data: { ok: false, code: "not_found" }, error: null };
    });
    const result = await operateProductionCredential({ requestId: "req-1", action: "rotate", confirm: true });
    expect(result.ok).toBe(true);
    expect(result.api_key?.startsWith("abx_live_")).toBe(true);
    expect(result.credential_state).toBe("rotating");
  });

  it("returns a durable revoked state without a raw key", async () => {
    rpcMock.mockImplementation(async (_name: string, args: { p_action?: string }) => {
      if (args?.p_action === "revoke") {
        return {
          data: { ok: true, code: "revoked", action: "revoke", credential_state: "revoked", activates_mainnet: false, executes: false, environment_changed: false },
          error: null,
        };
      }
      return { data: { ok: false, code: "not_found" }, error: null };
    });
    const result = await operateProductionCredential({ requestId: "req-1", action: "revoke", confirm: true });
    expect(result).toMatchObject({ ok: true, action: "revoke", credential_state: "revoked" });
    expect(result.api_key).toBeUndefined();
  });

  it("re-checks readiness before the write RPC", async () => {
    loadEvidenceMock.mockResolvedValue({ ...evidence, activeSandboxKey: false, allowedReturnUrls: [] });
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result.code).toBe("production_credential_not_ready");
    expect(rpcMock.mock.calls.filter((call) => call[1]?.p_action === "issue")).toHaveLength(0);
  });
});
