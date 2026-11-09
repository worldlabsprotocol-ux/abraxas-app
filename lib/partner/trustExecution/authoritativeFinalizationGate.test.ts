import { describe, expect, it, vi } from "vitest";
import { settleVerifiedAuthoritativeReceipt } from "./executeTrustExecutionAuthoritative";

describe("authoritative receipt finalization", () => {
  it("does not commit a receipt when issuer verification fails", async () => {
    const commit = vi.fn();
    const result = await settleVerifiedAuthoritativeReceipt({
      verify: async () => ({ ok: false, code: "wrong_environment" }),
      commit,
    });
    expect(result).toEqual({
      ok: false,
      code: "wrong_environment",
      decision_result: "indeterminate",
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it("does not commit a receipt when status publication fails", async () => {
    const commit = vi.fn();
    const result = await settleVerifiedAuthoritativeReceipt({
      verify: async () => ({ ok: false, code: "status_checkpoint_unavailable" }),
      commit,
    });
    expect(result.ok).toBe(false);
    expect(commit).not.toHaveBeenCalled();
  });

  it("commits only after verification succeeds", async () => {
    const commit = vi.fn(async () => ({ ok: true as const, receipt_id: "dr_ok", created: true }));
    const result = await settleVerifiedAuthoritativeReceipt({
      verify: async () => ({ ok: true as const, material: { portable: true } }),
      commit,
    });
    expect(result).toEqual({
      ok: true,
      material: { portable: true },
      receipt_id: "dr_ok",
      created: true,
    });
    expect(commit).toHaveBeenCalledOnce();
  });
});
