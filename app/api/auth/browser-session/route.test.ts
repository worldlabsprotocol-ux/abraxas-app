// FILE: app/api/auth/browser-session/route.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockResolve = vi.fn();
const mockIssue = vi.fn();
const mockAttach = vi.fn();
const mockVerify = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  BROWSER_SESSION_COOKIE: "abraxas_browser_session",
  resolveBrowserSession: (...args: unknown[]) => mockResolve(...args),
  issueBrowserSessionToken: (...args: unknown[]) => mockIssue(...args),
  attachBrowserSessionCookie: (...args: unknown[]) => mockAttach(...args),
}));

vi.mock("@/lib/auth/verifyZkLoginIdToken", () => ({
  verifyGoogleZkLoginIdToken: (...args: unknown[]) => mockVerify(...args),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { sui_address: "0x0000000000000000000000000000000000000000000000000000000000000001" },
          }),
        }),
      }),
    }),
  })),
}));

import { GET, POST } from "./route";

describe("GET /api/auth/browser-session readiness probe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  });

  it("returns only boolean readiness for authenticated session", async () => {
    mockResolve.mockResolvedValue({ suiAddress: "0xabc" });
    const res = await GET(new NextRequest("http://localhost/api/auth/browser-session"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("pragma")).toBe("no-cache");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns generic 401 for unauthenticated probe", async () => {
    mockResolve.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/auth/browser-session"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns the same generic 401 for malformed cookie values", async () => {
    mockResolve.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/auth/browser-session", {
      headers: { cookie: "abraxas_browser_session=not-a-valid-jwt" },
    }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("does not mint or mutate session on GET", async () => {
    mockResolve.mockResolvedValue(null);
    await GET(new NextRequest("http://localhost/api/auth/browser-session"));
    expect(mockIssue).not.toHaveBeenCalled();
    expect(mockAttach).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/browser-session mint contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssue.mockResolvedValue("signed-token");
    mockVerify.mockResolvedValue({ sub: "oauth-sub" });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  });

  it("does not return wallet address in JSON body", async () => {
    const res = await POST(new NextRequest("http://localhost/api/auth/browser-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_token: "token",
        sui_address: "0x0000000000000000000000000000000000000000000000000000000000000001",
      }),
    }));

    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(JSON.stringify(json)).not.toMatch(/0x|sui_address/i);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
