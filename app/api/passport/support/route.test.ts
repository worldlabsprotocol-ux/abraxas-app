import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionMock = vi.hoisted(() => vi.fn());
const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/passport/portableTrust/resolveHolderSession", () => ({
  resolveAuthenticatedHolderSession: sessionMock,
}));
vi.mock("@/lib/persistence/pgPool", () => ({ queryAbraxasPg: queryMock }));
vi.mock("@/lib/partner/launchpad/rateLimit", () => ({
  checkLaunchpadRateLimit: () => Promise.resolve({ allowed: true }),
}));

import { GET } from "./route";

describe("sovereign Passport support", () => {
  beforeEach(() => {
    sessionMock.mockReset();
    queryMock.mockReset();
  });

  it("rejects an unauthenticated holder without querying support records", async () => {
    sessionMock.mockResolvedValue({ ok: false, error: "unauthorized", message: "Sign in required" });
    const response = await GET(new NextRequest("https://abraxasworld.xyz/api/passport/support"));
    expect(response.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("scopes support history to the authenticated holder", async () => {
    const subjectId = `abx_hs_${"a".repeat(32)}`;
    sessionMock.mockResolvedValue({ ok: true, subjectId });
    queryMock.mockResolvedValue({ rows: [] });
    const response = await GET(new NextRequest("https://abraxasworld.xyz/api/passport/support"));
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([subjectId]);
  });
});
