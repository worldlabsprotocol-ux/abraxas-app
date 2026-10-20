// FILE: components/nav/solanaSignInDialogRecovery.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SolanaAccountSignInDialog } from "./SolanaAccountSignInDialog";

const signMessage = vi.fn();

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    publicKey: { toBase58: () => "Abcd1234WalletAddressExample111111111111" },
    signMessage,
    connected: true,
    connecting: false,
    connect: vi.fn(),
    select: vi.fn(),
    wallet: { adapter: { name: "Phantom" } },
    wallets: [{ adapter: { name: "Phantom" } }],
    disconnect: vi.fn(),
  }),
}));

vi.mock("@/lib/wallet/useSolanaWalletDiscovery", () => ({
  useSolanaWalletDiscovery: () => ({ offers: [] }),
  PREFERRED_SOLANA_WALLETS: ["Phantom"],
}));

describe("SolanaAccountSignInDialog signing recovery", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signMessage.mockReset();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/native/enabled")) {
          return Response.json({ auth_mode: "ephemeral_wallet" });
        }
        if (url.includes("/api/auth/wallet/solana/challenge")) {
          return Response.json({
            ok: true,
            challenge: { challenge_id: "ch_1", message: "Sign in to Abraxas" },
          });
        }
        return Response.json({ ok: false }, { status: 404 });
      }),
    );
  });

  it("allows Cancel while waiting for wallet signature", async () => {
    signMessage.mockImplementation(
      () =>
        new Promise<Uint8Array>(() => {
          /* pending */
        }),
    );

    const setBusy = vi.fn();
    render(
      <SolanaAccountSignInDialog
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        busy={false}
        setBusy={setBusy}
        setError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign message/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Cancel$/i })).toBeTruthy();
    });

    const cancel = screen.getByRole("button", { name: /^Cancel$/i });
    expect(cancel.hasAttribute("disabled")).toBe(false);
    fireEvent.click(cancel);

    await waitFor(() => {
      expect(setBusy).toHaveBeenCalledWith(false);
    });
  });
});
