import { beforeEach, describe, expect, it, vi } from "vitest";
import { postPartnerFlowComplete } from "./partnerFlowHandoff";

describe("postPartnerFlowComplete", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns server-issued redirect_url on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        redirect_url: "https://www.goodtroublecanna.com/callback?receipt_id=r1",
        partner_result: { receipt_id: "dr_r1" },
      }),
    }));

    const result = await postPartnerFlowComplete({
      partner_id: "good-trouble",
      policy_id: "good-trouble-retail-v2",
      return_url: "https://www.goodtroublecanna.com/callback",
    });

    expect(result).toEqual({
      ok: true,
      redirectUrl: "https://www.goodtroublecanna.com/callback?receipt_id=r1",
      receiptId: "dr_r1",
    });
  });

  it("fails closed when the server does not return a redirect_url", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }));

    const result = await postPartnerFlowComplete({
      partner_id: "good-trouble",
      policy_id: "good-trouble-retail-v2",
      return_url: "https://evil.example/callback",
    });

    expect(result).toEqual({ ok: false, category: "partner_flow_completion_failed" });
  });

  it("sends opaque verify_request instead of verification_request_id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        redirect_url: "https://partner.example/done",
        partner_result: { receipt_id: "dr_1" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await postPartnerFlowComplete({
      partner_id: "good-trouble",
      policy_id: "good-trouble-retail-v2",
      return_url: "https://partner.example/callback",
      verify_request: "vr_testopaque00000001",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.verify_request).toBe("vr_testopaque00000001");
    expect(body.verification_request_id).toBeUndefined();
  });

  it("classifies server 503 as partner_flow_server_unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ code: "sui_rpc_unavailable", error: "Sui RPC unavailable" }),
    }));

    const result = await postPartnerFlowComplete({
      partner_id: "good-trouble",
      policy_id: "good-trouble-retail-v2",
      return_url: "https://partner.example/callback",
    });

    expect(result).toEqual({ ok: false, category: "partner_flow_server_unavailable" });
  });

  it("classifies fetch throw as partner_flow_network_failed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await postPartnerFlowComplete({
      partner_id: "good-trouble",
      policy_id: "good-trouble-retail-v2",
      return_url: "https://partner.example/callback",
    });

    expect(result).toEqual({ ok: false, category: "partner_flow_network_failed" });
  });
});
