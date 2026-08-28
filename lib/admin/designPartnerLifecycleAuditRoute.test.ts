// FILE: lib/admin/designPartnerLifecycleAuditRoute.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_FORBIDDEN_RESPONSE_KEYS,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS,
} from "@/lib/admin/designPartnerLifecycleAuditContract";
import {
  encodeDesignPartnerLifecycleAuditCursor,
  DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_ENCODED_LENGTH,
} from "@/lib/admin/designPartnerLifecycleAuditCursor";
import { DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_NAME } from "@/lib/admin/designPartnerLifecycleAuditLoader";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

const checkProductionSensitiveAdminAccessMock = vi.fn();
const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  checkProductionSensitiveAdminAccess: (...args: unknown[]) =>
    checkProductionSensitiveAdminAccessMock(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: fromMock, rpc: rpcMock })),
}));

import { GET } from "@/app/api/admin/design-partners/[applicationId]/lifecycle-audit/route";

const APPLICATION_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_APPLICATION_ID = "00000000-0000-4000-8000-000000000002";
const ROW_ID = "10000000-0000-4000-8000-000000000003";

function lifecycleAuditRequest(
  applicationId: string,
  query = "",
) {
  const suffix = query ? `?${query}` : "";
  return new NextRequest(
    `http://localhost/api/admin/design-partners/${applicationId}/lifecycle-audit${suffix}`,
  );
}

function mockSupabase({
  exists = true,
  rpcData,
  rpcError = null,
}: {
  exists?: boolean;
  rpcData?: unknown;
  rpcError?: unknown;
} = {}) {
  fromMock.mockImplementation(() => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({
        data: exists ? { id: APPLICATION_ID } : null,
        error: null,
      })),
    };
    return chain;
  });

  rpcMock.mockResolvedValue({
    data: rpcData ?? {
      events: [
        {
          event_type: "admin.design_partner.approved",
          application_id: APPLICATION_ID,
          from_status: "submitted",
          to_status: "approved",
          promoted_partner_id: null,
          occurred_at: "2026-01-01T00:00:00.000Z",
          operator_category: "admin_authorized_email",
        },
      ],
      next_cursor: null,
    },
    error: rpcError,
  });
}

describe("lifecycle-audit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkProductionSensitiveAdminAccessMock.mockResolvedValue(true);
    mockSupabase();
  });

  it("returns 401 when production-sensitive access is denied before path/query validation", async () => {
    checkProductionSensitiveAdminAccessMock.mockResolvedValueOnce(false);
    const res = await GET(
      lifecycleAuditRequest(APPLICATION_ID, "limit=abc&cursor=%%%"),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects malformed application ids with 400", async () => {
    const res = await GET(
      lifecycleAuditRequest("not-a-uuid"),
      { params: Promise.resolve({ applicationId: "not-a-uuid" }) },
    );
    expect(res.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rejects unknown and repeated query parameters", async () => {
    const unknown = await GET(
      lifecycleAuditRequest(APPLICATION_ID, "status=submitted"),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(unknown.status).toBe(400);

    const repeated = await GET(
      lifecycleAuditRequest(APPLICATION_ID, "limit=25&limit=10"),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(repeated.status).toBe(400);
  });

  it.each(["0", "26", "abc", ""])("rejects invalid limit %j", async (limit) => {
    const res = await GET(
      lifecycleAuditRequest(APPLICATION_ID, `limit=${limit}`),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("rejects oversized, malformed, and wrong-application cursors", async () => {
    const oversized = "a".repeat(DESIGN_PARTNER_LIFECYCLE_AUDIT_CURSOR_MAX_ENCODED_LENGTH + 1);
    const oversizedRes = await GET(
      lifecycleAuditRequest(APPLICATION_ID, `cursor=${oversized}`),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(oversizedRes.status).toBe(400);

    const malformedRes = await GET(
      lifecycleAuditRequest(APPLICATION_ID, "cursor=%%%"),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(malformedRes.status).toBe(400);

    const wrongAppCursor = encodeDesignPartnerLifecycleAuditCursor(
      OTHER_APPLICATION_ID,
      "2026-01-01T00:00:00.000Z",
      ROW_ID,
    );
    const wrongAppRes = await GET(
      lifecycleAuditRequest(APPLICATION_ID, `cursor=${wrongAppCursor}`),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(wrongAppRes.status).toBe(400);
  });

  it("returns 404 for unknown applications", async () => {
    mockSupabase({ exists: false });
    const res = await GET(
      lifecycleAuditRequest(APPLICATION_ID),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(res.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns generic safe error on RPC failure", async () => {
    mockSupabase({ rpcError: { message: "audit_events permission denied" } });
    const res = await GET(
      lifecycleAuditRequest(APPLICATION_ID),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Service temporarily unavailable");
    expect(JSON.stringify(body)).not.toContain("audit_events");
  });

  it("returns allowlisted response without forbidden keys and uses v2 RPC only", async () => {
    const res = await GET(
      lifecycleAuditRequest(APPLICATION_ID),
      { params: Promise.resolve({ applicationId: APPLICATION_ID }) },
    );
    expect(res.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith(
      DESIGN_PARTNER_LIFECYCLE_AUDIT_RPC_NAME,
      expect.objectContaining({
        p_application_id: APPLICATION_ID,
        p_limit: 25,
        p_cursor_occurred_at: null,
        p_cursor_id: null,
      }),
    );

    const body = await res.json() as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([...DESIGN_PARTNER_LIFECYCLE_AUDIT_RESPONSE_KEYS].sort());
    const events = body.events as Array<Record<string, unknown>>;
    expect(events).toHaveLength(1);
    expect(Object.keys(events[0]!).sort()).toEqual([...DESIGN_PARTNER_LIFECYCLE_AUDIT_EVENT_DTO_KEYS].sort());
    for (const forbidden of DESIGN_PARTNER_LIFECYCLE_AUDIT_FORBIDDEN_RESPONSE_KEYS) {
      expect(body).not.toHaveProperty(forbidden);
      expect(events[0]).not.toHaveProperty(forbidden);
    }
    expect(JSON.stringify(body)).not.toContain("operator_category");
  });

  it("does not expose mutation handlers", async () => {
    const routeModule = await import("@/app/api/admin/design-partners/[applicationId]/lifecycle-audit/route");
    expect(routeModule).not.toHaveProperty("PATCH");
    expect(routeModule).not.toHaveProperty("POST");
    expect(routeModule).not.toHaveProperty("DELETE");
  });
});
