// @vitest-environment jsdom

import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PassportSolanaSessionBoundary } from "./PassportSolanaSessionBoundary";

const mocks = vi.hoisted(() => ({
  wallet: { current: { connected: false, connecting: false, publicKey: null as { toBase58: () => string } | null } },
}));

vi.mock("@solana/wallet-adapter-react", () => ({ useWallet: () => mocks.wallet.current }));

function browserSession(authMethod: string, walletCaip10: string | null = null) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ auth_method: authMethod, wallet_caip10: walletCaip10 }),
  }));
}

describe("PassportSolanaSessionBoundary", () => {
  beforeEach(() => {
    mocks.wallet.current = { connected: false, connecting: false, publicKey: null };
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("ends a Solana-authenticated session after wallet disconnection", async () => {
    mocks.wallet.current = {
      connected: true,
      connecting: false,
      publicKey: { toBase58: () => "wallet-a" },
    };
    browserSession("solana_wallet", "solana:devnet:wallet-a");
    const view = render(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    mocks.wallet.current = { connected: false, connecting: false, publicKey: null };
    view.rerender(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/auth/browser-session", {
      method: "DELETE", credentials: "include",
    }));
  });

  it("allows a refreshed tab to reconnect the same wallet before restoring access", async () => {
    browserSession("solana_wallet", "solana:devnet:wallet-a");
    render(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fetch).not.toHaveBeenCalledWith("/api/auth/browser-session", {
      method: "DELETE", credentials: "include",
    });
  });

  it("ends a Solana-authenticated session when another account is connected", async () => {
    mocks.wallet.current = {
      connected: true,
      connecting: false,
      publicKey: { toBase58: () => "wallet-b" },
    };
    browserSession("solana_wallet", "solana:devnet:wallet-a");
    render(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/auth/browser-session", {
      method: "DELETE", credentials: "include",
    }));
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
    expect(fetch).not.toHaveBeenCalledWith("/api/auth/browser-session", {
      method: "DELETE", credentials: "include",
    });
  });

  it("does not sign out Google or Sui sessions on Solana disconnect", async () => {
    browserSession("oauth");
    render(<PassportSolanaSessionBoundary />);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fetch).not.toHaveBeenCalledWith("/api/auth/browser-session", {
      method: "DELETE", credentials: "include",
    });
  });
});

