import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockResolveAdminAccess = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  resolveAdminAccess: (...args: unknown[]) => mockResolveAdminAccess(...args),
}));

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import { GET } from "./list/route";
import { POST } from "./update-status/route";

describe("admin purchases routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockImplementation(() => ({
      from: () => ({
        select: () => ({
          order: () => ({
            limit: async () => ({ data: [{ id: "pi_1", email: "hidden@example.com" }], error: null }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    }));
  });

  it("returns 401 for unauthenticated list requests without touching the database", async () => {
    mockResolveAdminAccess.mockResolvedValue({
      authorized: false,
      reason: "no_session",
      allowlist_configured: true,
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/purchases/list"));
    expect(res.status).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated non-admin list requests without touching the database", async () => {
    mockResolveAdminAccess.mockResolvedValue({
      authorized: false,
      reason: "email_not_allowlisted",
      allowlist_configured: true,
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/purchases/list"));
    expect(res.status).toBe(403);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated update requests without touching the database", async () => {
    mockResolveAdminAccess.mockResolvedValue({
      authorized: false,
      reason: "no_session",
      allowlist_configured: true,
    });

    const res = await POST(
      new NextRequest("http://localhost/api/admin/purchases/update-status", {
        method: "POST",
        body: JSON.stringify({ id: "pi_1", lifecycle_status: "captured" }),
      }),
    );
    expect(res.status).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated non-admin update requests without touching the database", async () => {
    mockResolveAdminAccess.mockResolvedValue({
      authorized: false,
      reason: "email_not_allowlisted",
      allowlist_configured: true,
    });

    const res = await POST(
      new NextRequest("http://localhost/api/admin/purchases/update-status", {
        method: "POST",
        body: JSON.stringify({ id: "pi_1", lifecycle_status: "captured" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("allows authorized administrators to list purchases", async () => {
    mockResolveAdminAccess.mockResolvedValue({
      authorized: true,
      reason: "email_allowlisted",
      allowlist_configured: true,
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/purchases/list"));
    const json = await res.json() as { purchases: unknown[] };

    expect(res.status).toBe(200);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(json.purchases).toHaveLength(1);
  });
});
