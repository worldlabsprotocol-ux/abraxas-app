// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useHostedSolanaHolderSession } from "./useHostedSolanaHolderSession";

const wallet = { connected: false, address: null as string | null };
const probe = vi.fn();

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    connected: wallet.connected,
    publicKey: wallet.address ? { toBase58: () => wallet.address } : null,
  }),
}));
vi.mock("@/lib/auth/ensureBrowserSession", () => ({
  probeBrowserSessionDetails: () => probe(),
}));

function Subject() {
  const session = useHostedSolanaHolderSession();
  return <output>{session.holderSubjectId ?? "signed session required"}</output>;
}

describe("hosted Solana holder session", () => {
  beforeEach(() => {
    wallet.connected = false;
    wallet.address = null;
    probe.mockReset();
  });
  afterEach(cleanup);

  it("does not treat a connected wallet as authentication", async () => {
    wallet.connected = true;
    wallet.address = "wallet-A";
    probe.mockResolvedValue({ ok: false });
    render(<Subject />);
    await waitFor(() => expect(probe).toHaveBeenCalled());
    expect(screen.getByText("signed session required")).toBeTruthy();
  });

  it("accepts only a signed session bound to the connected wallet", async () => {
    wallet.connected = true;
    wallet.address = "wallet-A";
    probe.mockResolvedValue({
      ok: true, authMethod: "solana_wallet", holderSubjectId: "abx_hs_A",
      walletCaip10: "solana:mainnet:wallet-A",
    });
    render(<Subject />);
    await waitFor(() => expect(screen.getByText("abx_hs_A")).toBeTruthy());
  });

  it("rejects a session signed by another wallet", async () => {
    wallet.connected = true;
    wallet.address = "wallet-B";
    probe.mockResolvedValue({
      ok: true, authMethod: "solana_wallet", holderSubjectId: "abx_hs_A",
      walletCaip10: "solana:mainnet:wallet-A",
    });
    render(<Subject />);
    await waitFor(() => expect(probe).toHaveBeenCalled());
    expect(screen.getByText("signed session required")).toBeTruthy();
  });

  it("hides protected state immediately on wallet change or disconnect", async () => {
    wallet.connected = true;
    wallet.address = "wallet-A";
    probe.mockResolvedValue({
      ok: true, authMethod: "solana_wallet", holderSubjectId: "abx_hs_A",
      walletCaip10: "solana:mainnet:wallet-A",
    });
    const view = render(<Subject />);
    await waitFor(() => expect(screen.getByText("abx_hs_A")).toBeTruthy());

    wallet.address = "wallet-B";
    view.rerender(<Subject />);
    expect(screen.getByText("signed session required")).toBeTruthy();

    wallet.connected = false;
    wallet.address = null;
    view.rerender(<Subject />);
    expect(screen.getByText("signed session required")).toBeTruthy();
  });
});
