// FILE: lib/partner/launchpad/productionCredentials/issue.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";

const fromMock = vi.fn();
const recordMock = vi.fn();
const getAppMock = vi.fn();
const loadEvidenceMock = vi.fn();
const probeMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
  SupabaseAdminConfigurationError: class extends Error { code = "supabase_admin_not_configured"; },
}));

vi.mock("@/lib/partner/launchpad/recordActivity", () => ({
  recordLaunchpadActivity: (...args: unknown[]) => recordMock(...args),
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

const inserts: Record<string, unknown>[] = [];
const appUpdates: Record<string, unknown>[] = [];
let requestStatus = "approved";
let liveKey: { id: string; revoked_at: string | null; key_prefix: string } | null = null;
let storeDown = false;

function chainFor(table: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.insert = (row: Record<string, unknown>) => {
    inserts.push(row);
    return chain;
  };
  chain.update = (row: Record<string, unknown>) => {
    if (table === "partner_launchpad_applications") appUpdates.push(row);
    if (table === "partner_api_keys" && liveKey && "revoked_at" in row) {
      liveKey = { ...liveKey, revoked_at: String(row.revoked_at) };
    }
    return chain;
  };
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
    if (table === "partner_api_keys") {
      return { data: liveKey, error: null };
    }
    return { data: null, error: null };
  };
  chain.single = async () => {
    if (storeDown) return { data: null, error: { message: "down" } };
    liveKey = { id: "live-key-1", revoked_at: null, key_prefix: "abx_live_xxxxxxx" };
    return { data: { id: "live-key-1" }, error: null };
  };
  return chain;
}

describe("operateProductionCredential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inserts.length = 0;
    appUpdates.length = 0;
    requestStatus = "approved";
    liveKey = null;
    storeDown = false;
    fromMock.mockImplementation((table: string) => chainFor(table));
    getAppMock.mockResolvedValue({ ...application, production_api_key_id: null });
    loadEvidenceMock.mockResolvedValue(evidence);
    probeMock.mockResolvedValue({ ready: true });
    recordMock.mockResolvedValue(undefined);
  });

  it("requires explicit confirmation and never issues on a status read", async () => {
    const denied = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: false });
    expect(denied).toMatchObject({ ok: false, code: "confirmation_required", activates_mainnet: false, executes: false });
    const status = await loadProductionCredentialStatus("req-1");
    expect(status.ok).toBe(true);
    expect(status).not.toHaveProperty("api_key");
    expect(status.credential_state).toBe("never_issued");
    expect(JSON.stringify(status)).not.toMatch(/abx_live_[A-Za-z0-9_-]{12,}/);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("denies pending and rejected reviews", async () => {
    requestStatus = "pending";
    expect((await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true })).code).toBe("review_not_approved");
    requestStatus = "rejected";
    expect((await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true })).code).toBe("review_not_approved");
  });

  it("fails closed when the store is unavailable", async () => {
    storeDown = true;
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("production_credential_store_unavailable");
    expect(result.credential_state).toBe("unavailable");
  });

  it("isolates tenants so the wrong partner app cannot mint a live key", async () => {
    getAppMock.mockResolvedValue(null);
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result).toMatchObject({ ok: false, code: "not_found" });
    expect(inserts).toHaveLength(0);
  });

  it("issues one abx_live_ key once, without changing environment or activating Mainnet", async () => {
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result.ok).toBe(true);
    expect(result.api_key?.startsWith("abx_live_")).toBe(true);
    expect(result.api_key).not.toMatch(/^abx_test_/);
    expect(result.key_prefix?.startsWith("abx_live_")).toBe(true);
    expect(result.activates_mainnet).toBe(false);
    expect(result.executes).toBe(false);
    expect(result.environment_changed).toBe(false);
    expect(inserts[0]?.key_prefix).toBe(result.key_prefix);
    expect(inserts[0]?.key_hash).toEqual(expect.any(String));
    expect(inserts[0]).not.toHaveProperty("raw");
    expect(appUpdates.some((row) => row.environment === "production")).toBe(false);
    const event = recordMock.mock.calls[0]?.[1] as { eventType: string; metadata: Record<string, unknown> };
    expect(event.eventType).toBe("production_credential_issued");
    expect(event.metadata.activates_production).toBe(false);
    expect(JSON.stringify(event)).not.toMatch(/abx_live_[A-Za-z0-9_-]{12,}/);
  });

  it("refuses silent duplicates and requires rotate for a second live key", async () => {
    getAppMock.mockResolvedValue({ ...application, production_api_key_id: "live-key-1" });
    liveKey = { id: "live-key-1", revoked_at: null, key_prefix: "abx_live_xxxxxxx" };
    const duplicate = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(duplicate).toMatchObject({ ok: false, code: "already_issued", credential_state: "active" });
    const rotated = await operateProductionCredential({ requestId: "req-1", action: "rotate", confirm: true });
    expect(rotated.ok).toBe(true);
    expect(rotated.action).toBe("rotate");
    expect(rotated.credential_state).toBe("rotating");
    expect(rotated.api_key?.startsWith("abx_live_")).toBe(true);
    const event = recordMock.mock.calls.at(-1)?.[1] as { eventType: string };
    expect(event.eventType).toBe("production_credential_rotated");
  });

  it("revokes an active live key without minting or executing", async () => {
    getAppMock.mockResolvedValue({ ...application, production_api_key_id: "live-key-1" });
    liveKey = { id: "live-key-1", revoked_at: null, key_prefix: "abx_live_xxxxxxx" };
    const result = await operateProductionCredential({ requestId: "req-1", action: "revoke", confirm: true });
    expect(result).toMatchObject({
      ok: true,
      action: "revoke",
      credential_state: "revoked",
      activates_mainnet: false,
      executes: false,
    });
    expect(result).not.toHaveProperty("api_key");
    const event = recordMock.mock.calls.at(-1)?.[1] as { eventType: string };
    expect(event.eventType).toBe("production_credential_revoked");
  });

  it("re-checks readiness before minting", async () => {
    loadEvidenceMock.mockResolvedValue({ ...evidence, activeSandboxKey: false, allowedReturnUrls: [] });
    const result = await operateProductionCredential({ requestId: "req-1", action: "issue", confirm: true });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("production_credential_not_ready");
    expect(inserts).toHaveLength(0);
  });
});
