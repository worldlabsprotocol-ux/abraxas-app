// FILE: lib/auth/hostedHolderBootstrapRoute.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";

const mockCreateHosted = vi.fn();
const mockAttachSession = vi.fn();
const mockResolveExisting = vi.fn();
const mockIsAllowed = vi.fn();
const mockRequireAdmin = vi.fn();

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
  requireSupabaseAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

describe("POST /api/auth/hosted-holder/bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockCreateHosted.mockResolvedValue({
      sessionId: "sess-1",
      oauthSub: "hosted:sess-1",
      suiAddress: "0x" + "a".repeat(64),
      provider: "abraxas_hosted",
    });
    mockAttachSession.mockResolvedValue(true);
    mockResolveExisting.mockResolvedValue(null);
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-secret";
  });

  it("bootstraps canonical Good Trouble purchase flow without Google", async () => {
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");
    const res = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: JSON.stringify({
        partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        return_url: "https://www.goodtroublecanna.com/age-verification-result",
      }),
    }));

    expect(res.status).toBe(200);
    const json = await res.json() as { ok?: boolean; session_kind?: string };
    expect(json.ok).toBe(true);
    expect(json.session_kind).toBe("hosted");
    expect(mockCreateHosted).toHaveBeenCalled();
    expect(mockAttachSession).toHaveBeenCalled();
  });

  it("rejects ineligible partner/policy tuples", async () => {
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");
    const res = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: JSON.stringify({
        partner_id: "other-partner",
        policy_id: "other-policy-v1",
        return_url: "https://www.goodtroublecanna.com/age-verification-result",
      }),
    }));

    expect(res.status).toBe(403);
    expect(mockCreateHosted).not.toHaveBeenCalled();
  });

  it("rejects disallowed return URLs", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const { POST } = await import("@/app/api/auth/hosted-holder/bootstrap/route");
    const res = await POST(new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
      method: "POST",
      body: JSON.stringify({
        partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        return_url: "https://evil.example/callback",
      }),
    }));

    expect(res.status).toBe(400);
    expect(mockCreateHosted).not.toHaveBeenCalled();
  });
});
