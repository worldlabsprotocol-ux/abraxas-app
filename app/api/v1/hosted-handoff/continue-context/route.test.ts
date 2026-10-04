import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const resolveHostedHandoffForContinue = vi.fn();

vi.mock("@/lib/partner/hostedHandoff/resolveForContinue", () => ({
  resolveHostedHandoffForContinue: (...args: unknown[]) => resolveHostedHandoffForContinue(...args),
}));

vi.mock("@/lib/partner/partnerVerifyResumeCookie", () => ({
  signPartnerContinueBindingCookie: vi.fn(async () => "binding-token"),
  attachPartnerContinueBindingCookie: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/hosted-handoff/continue-context", () => {
  it("returns holder preview for a resolvable hosted handoff", async () => {
    resolveHostedHandoffForContinue.mockResolvedValue({
      ok: true,
      preview: {
        verify_request: "vr_test1234567890",
        handoff_ref: "hpf_test1234567890",
        partner_id: "acme",
        policy_id: "acme-wallet_control-v1",
        policy_version: 1,
        purpose: "Confirm wallet control",
        application_id: "11111111-1111-1111-1111-111111111111",
        public_slug: "acme-proof",
        display_label: "Acme Proof",
        environment: "sandbox",
        action: "wallet_bound_action",
        result_family: "wallet_control_confirmed",
        expires_at: "2099-01-01T00:00:00.000Z",
        return_url: "https://example.com/callback",
      },
      continuation: { jti: "jti-1" },
    });

    const res = await GET(new NextRequest(
      "http://localhost/api/v1/hosted-handoff/continue-context?verify_request=vr_test1234567890",
    ));
    expect(res.status).toBe(200);
    const json = await res.json() as { partner_id?: string; return_url?: string; callback_bound?: boolean };
    expect(json.partner_id).toBe("acme");
    expect(json.return_url).toBe("https://example.com/callback");
    expect(json.callback_bound).toBe(true);
  });

  it("maps expired hosted handoffs to 410", async () => {
    resolveHostedHandoffForContinue.mockResolvedValue({ ok: false, code: "expired" });
    const res = await GET(new NextRequest(
      "http://localhost/api/v1/hosted-handoff/continue-context?verify_request=vr_expired00000000",
    ));
    expect(res.status).toBe(410);
  });

  it("maps missing hosted handoffs to 404", async () => {
    resolveHostedHandoffForContinue.mockResolvedValue({ ok: false, code: "missing" });
    const res = await GET(new NextRequest(
      "http://localhost/api/v1/hosted-handoff/continue-context?verify_request=vr_missing00000000",
    ));
    expect(res.status).toBe(404);
  });
});
