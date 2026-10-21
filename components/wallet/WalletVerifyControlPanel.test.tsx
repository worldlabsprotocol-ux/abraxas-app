// @vitest-environment jsdom
// FILE: components/wallet/WalletVerifyControlPanel.test.tsx

import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletVerifyControlPanel } from "./WalletVerifyControlPanel";

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    wallets: [{ adapter: { name: "Phantom" }, readyState: "Installed" }],
    select: vi.fn(),
    connect: vi.fn(),
    connected: false,
    connecting: false,
    publicKey: null,
    signMessage: undefined,
    wallet: null,
    disconnect: vi.fn(),
  }),
}));

vi.mock("@/lib/wallet/solanaWalletDiscovery", () => ({
  detectPhantomInjectable: () => true,
  detectSolflareInjectable: () => false,
  WALLET_INSTALL_URLS: { Phantom: "https://phantom.app/download", Solflare: "https://solflare.com/download" },
}));

vi.mock("@/lib/wallet/detectEvmProvider", () => ({
  detectEvmInjectable: () => true,
  detectMetaMaskInjectable: () => true,
  METAMASK_INSTALL_URL: "https://metamask.io/download/",
}));

describe("WalletVerifyControlPanel", () => {
  it("shows unified wallet selector instead of competing sign-in buttons", () => {
    render(<WalletVerifyControlPanel />);
    expect(screen.getByText("Verify wallet control")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Phantom/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /MetaMask/i })).toBeTruthy();
    expect(screen.queryByText("Sign in with EVM wallet")).toBeNull();
    expect(screen.queryByText("Sign to prove wallet control")).toBeNull();
  });
});
