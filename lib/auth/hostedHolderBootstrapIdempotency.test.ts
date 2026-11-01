import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapHostedHolderSession } from "./bootstrapHostedHolderSession";

const input = { partnerId: "good-trouble", policyId: "good-trouble-age_21_retail-v1", returnUrl: "https://partner.example/return" };

describe("hosted holder client session confirmation", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses only the server-confirmed holder subject and preserves the cookie", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, holder_subject_id: "abx_hs_verified" }) });
    vi.stubGlobal("fetch", fetcher);
    expect(await bootstrapHostedHolderSession(input)).toEqual({ ok: true, holderSubjectId: "abx_hs_verified" });
    expect(fetcher).toHaveBeenCalledWith("/api/auth/hosted-holder/bootstrap", expect.objectContaining({ credentials: "include" }));
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty("holder_subject_id");
    vi.unstubAllGlobals();
  });

  it("requires signed wallet authentication and never creates an anonymous identity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ code: "holder_sign_in_required" }) }));
    expect(await bootstrapHostedHolderSession(input)).toMatchObject({ ok: false, signInRequired: true });
    vi.unstubAllGlobals();
  });
});
