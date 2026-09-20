// FILE: lib/partner/launchpad/productionCredentials/productionCredentialsRoute.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const mockResolveAdminAccess = vi.fn();
const operateMock = vi.fn();
const statusMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  resolveAdminAccess: (...args: unknown[]) => mockResolveAdminAccess(...args),
}));

vi.mock("@/lib/partner/launchpad/productionCredentials", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/launchpad/productionCredentials")>();
  return {
    ...actual,
    operateProductionCredential: (...args: unknown[]) => operateMock(...args),
    loadProductionCredentialStatus: (...args: unknown[]) => statusMock(...args),
  };
});

import { GET, POST } from "@/app/api/admin/production-review/[id]/credential/route";

function getReq() {
  return GET(new NextRequest("http://localhost/api/admin/production-review/req-1/credential"), { params: { id: "req-1" } });
}

function post(body: unknown, origin = "http://localhost") {
  return POST(
    new NextRequest("http://localhost/api/admin/production-review/req-1/credential", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(body),
    }),
    { params: { id: "req-1" } },
  );
}

describe("production credential operator routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLaunchpadRateLimitStoreForTests();
    mockResolveAdminAccess.mockResolvedValue({ authorized: true, reason: "allowlisted_email", allowlist_configured: true });
    statusMock.mockResolvedValue({
      ok: true,
      credential_state: "never_issued",
      request_id: "req-1",
      application_id: "app-1",
      activates_mainnet: false,
      executes: false,
      environment_changed: false,
      api_key: "abx_live_SHOULD_NOT_APPEAR_IN_GET",
    });
    operateMock.mockResolvedValue({
      ok: true,
      action: "issue",
      credential_state: "active",
      api_key: "abx_live_one_time_secret_value",
      key_prefix: "abx_live_xxxxxxx",
      request_id: "req-1",
      application_id: "app-1",
      activates_mainnet: false,
      executes: false,
      environment_changed: false,
    });
  });

  it("denies unauthenticated and non-operator access", async () => {
    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "no_session", allowlist_configured: true });
    expect((await getReq()).status).toBe(401);
    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "email_not_allowlisted", allowlist_configured: true });
    expect((await getReq()).status).toBe(403);
    expect(statusMock).not.toHaveBeenCalled();
    expect(operateMock).not.toHaveBeenCalled();
  });

  it("never returns a raw key on GET", async () => {
    const res = await getReq();
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.api_key).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/abx_live_[A-Za-z0-9_-]{12,}/);
    expect(json.activates_mainnet).toBe(false);
    expect(json.executes).toBe(false);
  });

  it("requires CSRF origin and rejects client authority fields", async () => {
    const missing = await POST(
      new NextRequest("http://localhost/api/admin/production-review/req-1/credential", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "issue", confirm: true }),
      }),
      { params: { id: "req-1" } },
    );
    expect(missing.status).toBe(403);
    const override = await post({ action: "issue", confirm: true, activate_mainnet: true });
    expect(override.status).toBe(400);
    expect((await override.json() as { error: string }).error).toBe("production_credential_client_override_rejected");
    expect(operateMock).not.toHaveBeenCalled();
  });

  it("returns the raw key only on the intentional issue response", async () => {
    const res = await post({ action: "issue", confirm: true });
    expect(res.status).toBe(200);
    const json = await res.json() as { api_key: string; activates_mainnet: boolean; executes: boolean };
    expect(json.api_key).toBe("abx_live_one_time_secret_value");
    expect(json.activates_mainnet).toBe(false);
    expect(json.executes).toBe(false);
    expect(operateMock).toHaveBeenCalledWith({ requestId: "req-1", action: "issue", confirm: true });
  });

  it("omits raw keys from error responses", async () => {
    operateMock.mockResolvedValue({
      ok: false,
      code: "already_issued",
      credential_state: "active",
      api_key: "abx_live_SHOULD_NOT_LEAK",
      activates_mainnet: false,
      executes: false,
      environment_changed: false,
    });
    const res = await post({ action: "issue", confirm: true });
    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.api_key).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/abx_live_[A-Za-z0-9_-]{12,}/);
  });
});
