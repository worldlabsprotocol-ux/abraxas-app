import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCheckAdminAccess = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  checkAdminAccess: (...args: unknown[]) => mockCheckAdminAccess(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  }),
}));

import { GET } from "./list/route";
import { POST } from "./update-status/route";

describe("admin purchases routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated list requests", async () => {
    mockCheckAdminAccess.mockResolvedValue(false);
    const res = await GET(new NextRequest("http://localhost/api/admin/purchases/list"));
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated update requests", async () => {
    mockCheckAdminAccess.mockResolvedValue(false);
    const res = await POST(
      new NextRequest("http://localhost/api/admin/purchases/update-status", {
        method: "POST",
        body: JSON.stringify({ id: "pi_1", lifecycle_status: "captured" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("allows authenticated list requests", async () => {
    mockCheckAdminAccess.mockResolvedValue(true);
    const res = await GET(new NextRequest("http://localhost/api/admin/purchases/list"));
    expect(res.status).toBe(200);
  });
});
