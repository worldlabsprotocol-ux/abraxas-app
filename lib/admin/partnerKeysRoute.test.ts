import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

const checkProductionSensitiveAdminAccessMock = vi.fn();
const validatePartnerKeyIssuanceMock = vi.fn();
const insertMock = vi.fn();
const singleMock = vi.fn();
const selectMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  checkProductionSensitiveAdminAccess: (...args: unknown[]) =>
    checkProductionSensitiveAdminAccessMock(...args),
}));

vi.mock("@/lib/partner/validatePartnerKeyIssuance", () => ({
  validatePartnerKeyIssuance: (...args: unknown[]) => validatePartnerKeyIssuanceMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "partner_api_keys") {
        return {
          select: selectMock,
          insert: insertMock,
          order: orderMock,
          limit: limitMock,
        };
      }
      return {
        select: vi.fn(),
      };
    }),
  })),
}));

import { GET, POST } from "@/app/api/admin/partner-keys/route";

function postRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/partner-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin partner-keys route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    validatePartnerKeyIssuanceMock.mockResolvedValue({ ok: true });
    insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: singleMock,
      }),
    });
    singleMock.mockResolvedValue({
      data: {
        id: "key-1",
        partner_id: "sandbox-partner",
        display_name: "Webhook sandbox",
        key_prefix: "abx_test_abc123",
        scopes: ["webhooks:read"],
        created_at: "2026-08-08T00:00:00.000Z",
      },
      error: null,
    });
    selectMock.mockReturnValue({
      order: orderMock,
    });
    orderMock.mockReturnValue({
      limit: limitMock,
    });
    limitMock.mockResolvedValue({
      data: [
        {
          id: "key-1",
          partner_id: "sandbox-partner",
          display_name: "Webhook sandbox",
          key_prefix: "abx_test_abc123",
          scopes: ["webhooks:read"],
          revoked_at: null,
          created_at: "2026-08-08T00:00:00.000Z",
          last_used_at: null,
        },
      ],
      error: null,
    });
  });

  it("returns 401 when admin access is denied", async () => {
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(false);

    const res = await POST(postRequest({
      partner_id: "sandbox-partner",
      display_name: "Webhook sandbox",
      scopes: ["webhooks:read"],
    }));

    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("accepts explicit webhooks:read scopes for sandbox issuance", async () => {
    const res = await POST(postRequest({
      partner_id: "sandbox-partner",
      display_name: "Webhook sandbox",
      environment: "test",
      scopes: ["webhooks:read"],
    }));
    const body = await res.json() as { api_key?: string; key?: { scopes?: string[] } };

    expect(res.status).toBe(200);
    expect(body.api_key?.startsWith("abx_test_")).toBe(true);
    expect(body.key?.scopes).toEqual(["webhooks:read"]);
    expect(insertMock).toHaveBeenCalledWith({
      partner_id: "sandbox-partner",
      display_name: "Webhook sandbox",
      key_prefix: expect.stringMatching(/^abx_test_/),
      key_hash: expect.any(String),
      scopes: ["webhooks:read"],
    });
    expect(validatePartnerKeyIssuanceMock).toHaveBeenCalledWith("sandbox-partner", "test");
  });

  it("rejects invalid explicit scopes", async () => {
    const res = await POST(postRequest({
      partner_id: "sandbox-partner",
      display_name: "Webhook sandbox",
      scopes: ["webhooks:read", "not-a-real-scope"],
    }));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toContain("Unknown scope");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects explicit empty scopes", async () => {
    const res = await POST(postRequest({
      partner_id: "sandbox-partner",
      display_name: "Webhook sandbox",
      scopes: [],
    }));

    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("preserves legacy verify defaults when scopes are omitted", async () => {
    singleMock.mockResolvedValueOnce({
      data: {
        id: "key-2",
        partner_id: "sandbox-partner",
        display_name: "Verify sandbox",
        key_prefix: "abx_test_verify12",
        scopes: ["verify:credential", "verify:registry"],
        created_at: "2026-08-08T00:00:00.000Z",
      },
      error: null,
    });

    const res = await POST(postRequest({
      partner_id: "sandbox-partner",
      display_name: "Verify sandbox",
      environment: "test",
    }));
    const body = await res.json() as { key?: { scopes?: string[] } };

    expect(res.status).toBe(200);
    expect(body.key?.scopes).toEqual(["verify:credential", "verify:registry"]);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      scopes: ["verify:credential", "verify:registry"],
    }));
  });

  it("defaults omitted environment to test", async () => {
    await POST(postRequest({
      partner_id: "sandbox-partner",
      display_name: "Verify sandbox",
      scopes: ["webhooks:read"],
    }));

    expect(validatePartnerKeyIssuanceMock).toHaveBeenCalledWith("sandbox-partner", "test");
  });

  it("rejects live issuance for sandbox-only partners before insert", async () => {
    validatePartnerKeyIssuanceMock.mockResolvedValue({
      ok: false,
      error: "Partner not approved for production keys. Current: sandbox",
      status: 403,
    });

    const res = await POST(postRequest({
      partner_id: "sandbox-partner",
      display_name: "Webhook sandbox",
      environment: "live",
      scopes: ["webhooks:read"],
    }));

    expect(res.status).toBe(403);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("does not expose raw api_key in list responses", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/partner-keys"));
    const body = await res.json() as { keys: Array<Record<string, unknown>> };

    expect(res.status).toBe(200);
    expect(body.keys[0]).not.toHaveProperty("api_key");
    expect(body.keys[0]).not.toHaveProperty("key_hash");
  });
});
