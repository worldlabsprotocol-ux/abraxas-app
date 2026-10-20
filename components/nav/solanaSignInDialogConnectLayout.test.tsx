// FILE: components/nav/solanaSignInDialogConnectLayout.test.tsx
/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SolanaAccountSignInDialog } from "./SolanaAccountSignInDialog";

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    publicKey: null,
    signMessage: vi.fn(),
    connected: false,
    connecting: false,
    connect: vi.fn(),
    select: vi.fn(),
    wallet: null,
    wallets: [
      {
        adapter: {
          name: "Phantom",
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
        },
      },
      {
        adapter: {
          name: "Solflare",
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
        },
      },
    ],
    disconnect: vi.fn(),
  }),
}));

vi.mock("@/lib/wallet/useSolanaWalletDiscovery", () => ({
  useSolanaWalletDiscovery: () => ({
    offers: {
      Phantom: { status: "available", readyState: "Installed", listed: true },
      Solflare: { status: "available", readyState: "Installed", listed: true },
    },
  }),
  PREFERRED_SOLANA_WALLETS: ["Phantom", "Solflare"],
}));

describe("SolanaAccountSignInDialog connect layout", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ auth_mode: "ephemeral_wallet" })));
  });

  it("shows heading, Phantom primary, disclaimer, and Solflare secondary without Connect-with copy", () => {
    render(
      <SolanaAccountSignInDialog
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        busy={false}
        setBusy={vi.fn()}
        setError={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: /Connect your wallet/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Connect with Phantom/i })).toBeTruthy();
    expect(screen.getByText(/^Phantom$/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Connect with Solflare/i })).toBeTruthy();
    expect(document.getElementById("sol-account-signin-desc")?.textContent).toMatch(
      /review the sign-in request/i,
    );
    expect(screen.queryByText(/Connect Phantom/i)).toBeNull();
    expect(screen.queryByText(/Connect with Phantom/i, { selector: "span" })).toBeNull();
  });
});
