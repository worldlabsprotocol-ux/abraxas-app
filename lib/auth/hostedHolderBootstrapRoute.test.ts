import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GOOD_TROUBLE_CANONICAL_PARTNER_ID, GOOD_TROUBLE_CANONICAL_POLICY_ID } from "@/lib/goodTrouble/canonicalProductionConfig";

const resolveSession = vi.fn();
const allowedReturn = vi.fn();
const admin = vi.fn();
vi.mock("@/lib/auth/browserSession", () => ({ resolveBrowserSession: (...args: unknown[]) => resolveSession(...args) }));
vi.mock("@/lib/partner/returnUrlAllowlist", () => ({ isAllowedPartnerReturnUrl: (...args: unknown[]) => allowedReturn(...args) }));
vi.mock("@/lib/supabase/admin", () => ({ requireSupabaseAdmin: (...args: unknown[]) => admin(...args) }));

import { POST } from "@/app/api/auth/hosted-holder/bootstrap/route";

function request(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/auth/hosted-holder/bootstrap", {
    method: "POST",
    body: JSON.stringify({
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      return_url: "https://www.goodtroublecanna.com/age-verification-result",
      ...body,
    }),
  });
}

describe("hosted holder Solana session boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSession.mockResolvedValue({ authMethod: "solana_wallet", holderSubjectId: "abx_hs_holder", walletCaip10: "solana:devnet:wallet" });
    allowedReturn.mockResolvedValue(true);
  });

  it("accepts a signed Solana subject without creating another identity or cookie", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, holder_subject_id: "abx_hs_holder", session_kind: "solana_wallet" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it.each([null, { authMethod: "wallet", holderSubjectId: "abx_hs_holder" }, { authMethod: "solana_wallet", holderSubjectId: null }])(
    "rejects missing or non-Solana authentication: %s", async (session) => {
      resolveSession.mockResolvedValue(session);
      const res = await POST(request());
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, code: "holder_sign_in_required" });
      expect(allowedReturn).not.toHaveBeenCalled();
    },
  );

  it("rejects client identity overrides", async () => {
    const res = await POST(request({ holder_subject_id: "abx_hs_other" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("client_identity_rejected");
  });

  it("rejects disallowed callbacks", async () => {
    allowedReturn.mockResolvedValue(false);
    const res = await POST(request({ return_url: "https://evil.example/return" }));
    expect(res.status).toBe(400);
  });

  it("rejects expired requests before returning a holder subject", async () => {
    admin.mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      return_url: "https://www.goodtroublecanna.com/age-verification-result",
      status: "pending",
      expires_at: "2020-01-01T00:00:00Z",
    }, error: null }) }) }) }) });
    const res = await POST(request({ verify_request: "vr_expired" }));
    expect(res.status).toBe(410);
    expect((await res.json()).code).toBe("request_expired");
  });

  it("rejects a request already pinned to another holder", async () => {
    const eq = vi.fn().mockReturnValue({ maybeSingle: async () => ({ data: {
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      return_url: "https://www.goodtroublecanna.com/age-verification-result",
      status: "pending", expires_at: "2099-01-01T00:00:00Z",
      subject_id: "abx_hs_other", sui_address: null,
    }, error: null }) });
    admin.mockReturnValue({ from: () => ({ select: () => ({ eq }) }) });
    const res = await POST(request({ verify_request: "vr_bound" }));
    expect(eq).toHaveBeenCalledWith("id", "vr_bound");
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("holder_mismatch");
  });
});
