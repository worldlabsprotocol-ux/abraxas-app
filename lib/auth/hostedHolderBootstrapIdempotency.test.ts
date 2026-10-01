// FILE: lib/auth/hostedHolderBootstrapIdempotency.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";

const HOSTED_SUI = "0x" + "a".repeat(64);
const OAUTH_SUI = "0x" + "b".repeat(64);

const mockCreateHosted = vi.fn();
const mockAttachSession = vi.fn();
const mockResolveExisting = vi.fn();
const mockIsAllowed = vi.fn();

vi.mock("@/lib/auth/hostedHolderSession", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/hostedHolderSession")>();
  return {
    ...actual,
    createHostedHolderIdentity: (...args: unknown[]) => mockCreateHosted(...args),
    attachHostedHolderBrowserSession: (...args: unknown[]) => mockAttachSession(...args),
    resolveExistingBootstrapBrowserSession: (...args: unknown[]) => mockResolveExisting(...args),
  };
});

vi.mock("@/lib/partner/returnUrlAllowlist", () => ({
  isAllowedPartnerReturnUrl: (...args: unknown[]) => mockIsAllowed(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(),
}));

function canonicalBody(overrides: Record<string, string> = {}) {
  return JSON.stringify({
    partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
    policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
    return_url: "https://www.goodtroublecanna.com/age-verification-result",
    ...overrides,
  });
}

describe("hosted-holder bootstrap idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAttachSession.mockResolvedValue(true);
    mockResolveExisting.mockResolvedValue(null);
    mockCreateHosted.mockResolvedValue({
      sessionId: "sess-new",
      oauthSub: "hosted:sess-new",
      suiAddress: HOSTED_SUI,
      provider: "abraxas_hosted",
    });
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-secret";
  });

  it("reuses an existing hosted browser session without creating a second identity", async () => {
    mockResolveExisting.mockResolvedValue({ kind: "hosted", suiAddress: HOSTED_SUI });
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");

    const res1 = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: canonicalBody(),
    }));
    const res2 = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: canonicalBody(),
    }));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    const json1 = await res1.json() as { reused?: boolean; sui_address?: string };
    const json2 = await res2.json() as { reused?: boolean; sui_address?: string };
    expect(json1.reused).toBe(true);
    expect(json2.reused).toBe(true);
    expect(json1.sui_address).toBe(HOSTED_SUI);
    expect(json2.sui_address).toBe(HOSTED_SUI);
    expect(mockCreateHosted).not.toHaveBeenCalled();
  });

  it("creates a fresh hosted identity when no valid browser session exists", async () => {
    mockResolveExisting.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");

    const res = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: canonicalBody(),
    }));

    expect(res.status).toBe(200);
    const json = await res.json() as { reused?: boolean };
    expect(json.reused).toBe(false);
    expect(mockCreateHosted).toHaveBeenCalledTimes(1);
  });

  it("falls through to fresh bootstrap when browser session is invalid or expired", async () => {
    // resolveExistingBootstrapBrowserSession returns null for missing, tampered, or expired cookies.
    mockResolveExisting.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");

    const res = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: canonicalBody(),
      headers: { cookie: "abraxas_browser_session=expired-or-invalid.jwt.token" },
    }));

    expect(res.status).toBe(200);
    const json = await res.json() as { reused?: boolean };
    expect(json.reused).toBe(false);
    expect(mockCreateHosted).toHaveBeenCalledTimes(1);
  });

  it("reuses OAuth browser session without minting a new hosted identity", async () => {
    mockResolveExisting.mockResolvedValue({
      kind: "oauth",
      suiAddress: OAUTH_SUI,
      provider: "google",
    });
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");

    const res = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: canonicalBody(),
    }));

    expect(res.status).toBe(200);
    const json = await res.json() as { session_kind?: string; reused?: boolean; sui_address?: string };
    expect(json.session_kind).toBe("oauth");
    expect(json.reused).toBe(true);
    expect(json.sui_address).toBe(OAUTH_SUI);
    expect(mockCreateHosted).not.toHaveBeenCalled();
    expect(mockAttachSession).not.toHaveBeenCalled();
  });

  it("rejects disallowed return_url before identity reuse or creation", async () => {
    mockIsAllowed.mockResolvedValue(false);
    mockResolveExisting.mockResolvedValue({ kind: "hosted", suiAddress: HOSTED_SUI });
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");

    const res = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: canonicalBody({ return_url: "https://evil.example/callback" }),
    }));

    expect(res.status).toBe(400);
    expect(mockCreateHosted).not.toHaveBeenCalled();
    expect(mockResolveExisting).not.toHaveBeenCalled();
  });

  it("rejects client-provided sui_address instead of selecting an identity", async () => {
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");

    const res = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: JSON.stringify({
        partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        return_url: "https://www.goodtroublecanna.com/age-verification-result",
        sui_address: OAUTH_SUI,
      }),
    }));

    expect(res.status).toBe(400);
    expect(mockCreateHosted).not.toHaveBeenCalled();
    expect(mockResolveExisting).not.toHaveBeenCalled();
  });
});
