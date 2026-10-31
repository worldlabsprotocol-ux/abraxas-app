// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PassportSolanaWalletConnection } from "./PassportSolanaWalletConnection";

const mocks = vi.hoisted(() => ({
  walletContext: { current: {} as Record<string, unknown> },
  walletModal: { setVisible: vi.fn() },
  connectSelected: vi.fn(),
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => mocks.walletContext.current,
}));

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  useWalletModal: () => mocks.walletModal,
}));

vi.mock("@/lib/wallet/connectSelectedSolanaWallet", () => ({
  connectSelectedSolanaWallet: mocks.connectSelected,
}));

vi.mock("@/components/redesign/ui", () => ({
  Btn: ({ children, onClick, disabled, loading }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled || loading}>
      {children}
    </button>
  ),
}));

function setWalletState(overrides: Record<string, unknown> = {}) {
  const disconnect = vi.fn().mockResolvedValue(undefined);
  mocks.walletContext.current = {
    connect: vi.fn().mockResolvedValue(undefined),
    connected: false,
    connecting: false,
    disconnect,
    publicKey: null,
    select: vi.fn(),
    wallet: null,
    wallets: [{
      adapter: { name: "Phantom" },
      readyState: WalletReadyState.Installed,
    }],
    ...overrides,
  };
}

describe("PassportSolanaWalletConnection", () => {
  beforeEach(() => {
    mocks.walletModal.setVisible.mockReset();
    mocks.connectSelected.mockReset().mockResolvedValue(undefined);
    setWalletState();
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the shared wallet modal when no provider is selected", () => {
    render(<PassportSolanaWalletConnection />);

    fireEvent.click(screen.getByRole("button", { name: "Choose a Solana wallet" }));

    expect(mocks.walletModal.setVisible).toHaveBeenCalledWith(true);
  });

  it("connects the selected supported adapter without signing in", async () => {
    setWalletState({
      wallet: {
        adapter: { name: "Phantom" },
        readyState: WalletReadyState.Installed,
      },
    });
    render(<PassportSolanaWalletConnection />);

    fireEvent.click(screen.getByRole("button", { name: "Connect Phantom" }));

    await waitFor(() => expect(mocks.connectSelected).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: "Phantom" }),
    ));
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("shows the live connected account and disconnect action", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    setWalletState({
      connected: true,
      disconnect,
      publicKey: { toBase58: () => "So11111111111111111111111111111111111111112" },
      wallet: {
        adapter: { name: "Solflare" },
        readyState: WalletReadyState.Installed,
      },
    });
    render(<PassportSolanaWalletConnection />);

    expect(screen.getByRole("status", { name: "Connected Solana wallet" })).toHaveTextContent(
      "Connected · Solflare",
    );
    expect(screen.getByText("So11…1112")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Disconnect wallet" }));

    await waitFor(() => expect(disconnect).toHaveBeenCalledOnce());
  });
});
