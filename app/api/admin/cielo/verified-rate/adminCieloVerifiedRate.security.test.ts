// FILE: app/api/admin/cielo/verified-rate/adminCieloVerifiedRate.security.test.ts

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/adminAuth", () => ({
  checkAdmin: vi.fn(() => false),
}));

vi.mock("@/lib/cielo/verifiedRateOperator", () => ({
  listVerifiedRateRequests: vi.fn(),
  getVerifiedRateRequestByRef: vi.fn(),
  applyOperatorAction: vi.fn(),
}));

import { GET } from "@/app/api/admin/cielo/verified-rate/route";

describe("admin cielo verified-rate route", () => {
  it("returns 401 without operator auth", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/cielo/verified-rate"));
    expect(res.status).toBe(401);
  });
});
