// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSolanaPassportSession } from "./useSolanaPassportSession";

const subject = `abx_hs_${"a".repeat(32)}`;
const wallet = vi.hoisted(() => ({
  current: { connected: false, publicKey: null as { toBase58: () => string } | null },
}));

vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => wallet.current }));

function signedSession(subjectId = subject, address = "wallet-a") {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      auth_method: "solana_wallet",
      holder_subject_id: subjectId,
      wallet_caip10: `solana:devnet:${address}`,
    }),
  }));
}

describe("Solana Passport session restoration", () => {
  beforeEach(() => { wallet.current = { connected: false, publicKey: null }; });
  afterEach(() => vi.unstubAllGlobals());

  it("requires the same connected wallet before showing its holder workspace", async () => {
    signedSession();
    const view = renderHook(() => useSolanaPassportSession());
    await waitFor(() => expect(view.result.current.state.kind).toBe("reconnect"));

    wallet.current = { connected: true, publicKey: { toBase58: () => "wallet-b" } };
    view.rerender();
    expect(view.result.current.state.kind).toBe("reconnect");

    wallet.current = { connected: true, publicKey: { toBase58: () => "wallet-a" } };
    view.rerender();
    expect(view.result.current.state).toEqual({ kind: "authenticated", holderSubjectId: subject });
  });

  it("rejects a session without an authoritative holder subject", async () => {
    wallet.current = { connected: true, publicKey: { toBase58: () => "wallet-a" } };
    signedSession("0xlegacy");
    const view = renderHook(() => useSolanaPassportSession());
    await waitFor(() => expect(view.result.current.state.kind).toBe("reconnect"));
  });

  it("does not restore an expired session", async () => {
    wallet.current = { connected: true, publicKey: { toBase58: () => "wallet-a" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const view = renderHook(() => useSolanaPassportSession());
    await waitFor(() => expect(view.result.current.state.kind).toBe("other"));
  });
});

