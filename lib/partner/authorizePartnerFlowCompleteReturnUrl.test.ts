import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizePartnerFlowCompleteReturnUrl } from "./authorizePartnerFlowCompleteReturnUrl";

const peekByVerifyRequestId = vi.fn();

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    peekByVerifyRequestId: (...args: unknown[]) => peekByVerifyRequestId(...args),
  }),
}));

vi.mock("@/lib/connect/returnUrlAllowlist", () => ({
  isReturnUrlAllowed: vi.fn(async () => false),
}));

import { isReturnUrlAllowed } from "@/lib/connect/returnUrlAllowlist";

const PARTNER = "studio-accept-wc-1792620888278-6a4a2447dfc8";
const DEMO_CALLBACK = "https://demo.abraxasworld.xyz/partner/callback";
const VR = "vr_7b081548514a70ef";

beforeEach(() => {
  peekByVerifyRequestId.mockReset();
  vi.mocked(isReturnUrlAllowed).mockReset();
  vi.mocked(isReturnUrlAllowed).mockResolvedValue(false);
});

describe("authorizePartnerFlowCompleteReturnUrl", () => {
  it("accepts Launchpad-bound demo callback via continuation when partner allowlist is stale", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    peekByVerifyRequestId.mockResolvedValue({
      partnerId: PARTNER,
      policyId: `${PARTNER}-wallet_control-v1`,
      returnUrl: DEMO_CALLBACK,
      jti: "jti-1",
      createdAt: new Date().toISOString(),
      expiresAt: future,
      verifyRequestId: VR,
    });

    const result = await authorizePartnerFlowCompleteReturnUrl({
      partnerId: PARTNER,
      returnUrl: DEMO_CALLBACK,
      correlationId: VR,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.authoritativeReturnUrl).toBe(DEMO_CALLBACK);
      expect(result.source).toBe("continuation");
    }
    expect(isReturnUrlAllowed).not.toHaveBeenCalled();
  });

  it("rejects return_url drift from continuation binding", async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    peekByVerifyRequestId.mockResolvedValue({
      partnerId: PARTNER,
      policyId: `${PARTNER}-wallet_control-v1`,
      returnUrl: DEMO_CALLBACK,
      jti: "jti-1",
      createdAt: new Date().toISOString(),
      expiresAt: future,
      verifyRequestId: VR,
    });

    const result = await authorizePartnerFlowCompleteReturnUrl({
      partnerId: PARTNER,
      returnUrl: "https://evil.example/callback",
      correlationId: VR,
    });

    expect(result).toEqual({ ok: false, code: "open_redirect" });
  });

  it("falls back to partner allowlist when no continuation exists", async () => {
    peekByVerifyRequestId.mockResolvedValue(null);
    vi.mocked(isReturnUrlAllowed).mockResolvedValue(true);

    const result = await authorizePartnerFlowCompleteReturnUrl({
      partnerId: PARTNER,
      returnUrl: DEMO_CALLBACK,
      correlationId: VR,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe("partner_allowlist");
  });
});
