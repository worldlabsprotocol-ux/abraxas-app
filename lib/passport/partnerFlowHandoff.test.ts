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
});
