import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const browserMock = vi.fn();
const partnerMock = vi.fn();
const accountMock = vi.fn();
const membershipsMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  resolveBrowserSession: (...args: unknown[]) => browserMock(...args),
}));
vi.mock("@/lib/auth/accountSession", () => ({
  resolveAccountSession: (...args: unknown[]) => accountMock(...args),
}));
vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => partnerMock(...args),
}));
vi.mock("@/lib/auth/nativeAccount/store", () => ({
  listPartnerMemberships: (...args: unknown[]) => membershipsMock(...args),
}));

import { GET } from "./route";

describe("GET /api/account/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserMock.mockResolvedValue(null);
    partnerMock.mockResolvedValue(null);
    accountMock.mockResolvedValue(null);
    membershipsMock.mockResolvedValue([]);
  });

  it("returns independent session flags without requiring holder auth", async () => {
    const res = await GET(new NextRequest("http://localhost/api/account/overview"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sessions_are_independent).toBe(true);
    expect(body.holder.authenticated).toBe(false);
    expect(body.partner_console.authenticated).toBe(false);
    expect(body.native_account.authenticated).toBe(false);
  });

  it("does not merge partner id into holder subject", async () => {
    browserMock.mockResolvedValueOnce({
      subjectId: "0x" + "c".repeat(64),
      authMethod: "oauth",
    });
    partnerMock.mockResolvedValueOnce({
      partnerId: "sandbox_partner",
      apiKeyId: "k1",
      environment: "sandbox",
    });
    const res = await GET(new NextRequest("http://localhost/api/account/overview"));
    const body = await res.json();
    expect(body.holder.subject_id).toMatch(/^0x/);
    expect(body.partner_console.partner_id).toBe("sandbox_partner");
  });
});
