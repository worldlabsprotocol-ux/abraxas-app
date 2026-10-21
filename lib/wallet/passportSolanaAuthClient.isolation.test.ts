// FILE: lib/wallet/passportSolanaAuthClient.isolation.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runPassportSolanaWalletAuth } from "./passportSolanaAuthClient";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";
import { createWalletVerifyAttempt } from "./walletVerifyAttempt";

describe("runPassportSolanaWalletAuth attempt isolation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("issues a fresh challenge on each retry attempt", async () => {
    const challengeIds = ["c1", "c2"];
    vi.mocked(fetch)
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes("/challenge")) {
          const id = challengeIds.shift() ?? "c-extra";
          return {
            ok: true,
            json: async () => ({ ok: true, challenge: { challenge_id: id, message: `msg-${id}` } }),
          } as Response;
        }
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      });

    const signMessage = vi.fn(async () => new Uint8Array([9]));

    const first = createWalletVerifyAttempt();
    await runPassportSolanaWalletAuth({
      walletAddress: "abc",
      signMessage,
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt: first,
    });

    const second = createWalletVerifyAttempt();
    await runPassportSolanaWalletAuth({
      walletAddress: "abc",
      signMessage,
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt: second,
    });

    const challengeCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/challenge"));
    expect(challengeCalls).toHaveLength(2);
    expect(challengeCalls.every(([, init]) => (init as RequestInit).credentials === "include")).toBe(true);
  });

  it("does not verify or dispatch session when attempt was invalidated after sign", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, challenge: { challenge_id: "c1", message: "sign-me" } }),
      } as Response);

    const attempt = createWalletVerifyAttempt();
    const signMessage = vi.fn(async () => {
      attempt.invalidate();
      return new Uint8Array([1]);
    });

    const result = await runPassportSolanaWalletAuth({
      walletAddress: "abc",
      signMessage,
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale");
    const verifyCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/verify"));
    expect(verifyCalls).toHaveLength(0);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it("returns verify phase when server rejects signature", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, challenge: { challenge_id: "c-verify-fail", message: "sign-me" } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, code: "session_context_mismatch" }),
      } as Response);

    const attempt = createWalletVerifyAttempt();
    const result = await runPassportSolanaWalletAuth({
      walletAddress: "abc",
      signMessage: vi.fn(async () => new Uint8Array([3])),
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.phase).toBe("verify");
      expect(result.code).toBe("session_context_mismatch");
    }
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it("returns sign phase when wallet rejects message signing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, challenge: { challenge_id: "c-sign-fail", message: "sign-me" } }),
    } as Response);

    const signMessage = vi.fn(async () => {
      throw new Error("User rejected");
    });

    const result = await runPassportSolanaWalletAuth({
      walletAddress: "abc",
      signMessage,
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt: createWalletVerifyAttempt(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.phase).toBe("sign");
      expect(result.code).toBe("cancelled");
    }
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/verify"))).toBe(false);
  });

  it("does not verify when a newer attempt supersedes during wallet signing", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, challenge: { challenge_id: "old-challenge", message: "old" } }),
      } as Response);

    const first = createWalletVerifyAttempt();
    const signMessage = vi.fn(async () => {
      createWalletVerifyAttempt();
      return new Uint8Array([2]);
    });

    const result = await runPassportSolanaWalletAuth({
      walletAddress: "abc",
      signMessage,
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      attempt: first,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("stale");
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/verify"))).toBe(false);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
});
