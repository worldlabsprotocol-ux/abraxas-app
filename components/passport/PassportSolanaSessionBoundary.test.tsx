// @vitest-environment jsdom

import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PassportSolanaSessionBoundary } from "./PassportSolanaSessionBoundary";

const mocks = vi.hoisted(() => ({
  wallet: { current: { connected: false, connecting: false, publicKey: null as { toBase58: () => string } | null } },
  signOut: vi.fn(),
}));

vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => mocks.wallet.current }));
vi.mock("@/components/sui/SuiAuthProvider", () => ({ useSuiAuth: () => ({ signOut: mocks.signOut }) }));

function browserSession(authMethod: string, walletCaip10: string | null = null) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ auth_method: authMethod, wallet_caip10: walletCaip10 }),
  }));
}

describe("PassportSolanaSessionBoundary", () => {
  beforeEach(() => {
    mocks.signOut.mockReset();
    mocks.wallet.current = { connected: false, connecting: false, publicKey: null };
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("ends a Solana-authenticated session after wallet disconnection", async () => {
    browserSession("solana_wallet", "solana:devnet:wallet-a");
    render(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
  });

  it("ends a Solana-authenticated session when another account is connected", async () => {
    mocks.wallet.current = {
      connected: true,
      connecting: false,
      publicKey: { toBase58: () => "wallet-b" },
    };
    browserSession("solana_wallet", "solana:devnet:wallet-a");
    render(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
  });

  it("keeps a session signed by the currently connected account", async () => {
    mocks.wallet.current = {
      connected: true,
      connecting: false,
      publicKey: { toBase58: () => "wallet-a" },
    };
    browserSession("solana_wallet", "solana:devnet:wallet-a");
    render(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("does not sign out Google or Sui sessions on Solana disconnect", async () => {
    browserSession("oauth");
    render(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
