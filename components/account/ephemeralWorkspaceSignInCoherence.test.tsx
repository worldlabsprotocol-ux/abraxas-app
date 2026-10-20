// FILE: components/account/ephemeralWorkspaceSignInCoherence.test.tsx
/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EphemeralSandboxWorkspaceClient } from "./EphemeralSandboxWorkspaceClient";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { WALLET_SIGN_IN_DIALOG_EVENT } from "@/lib/auth/ephemeralWallet/clientSession";

vi.mock("@solana/wallet-adapter-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/wallet-adapter-react")>();
  return {
    ...actual,
    useWallet: () => ({
      publicKey: { toBase58: () => "Abcd1234WalletAddressExample111111111111" },
      signMessage: vi.fn(),
      connected: true,
      connecting: false,
      connect: vi.fn(),
      select: vi.fn(),
      wallet: { adapter: { name: "Phantom" } },
      wallets: [],
      disconnect: vi.fn(),
    }),
  };
});

describe("EphemeralSandboxWorkspaceClient sign-in coherence", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/wallet/enabled")) {
          return Response.json({ operational: true, config_ok: true });
        }
        if (url.includes("/api/auth/wallet/session")) {
          return Response.json({ authenticated: false });
        }
        if (url.includes("/api/auth/wallet/sandbox/policies")) {
          return Response.json({ policies: [], availability: [] });
        }
        if (url.includes("/api/auth/wallet/sandbox/workspace")) {
          return Response.json({ ok: true, workspace: null });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("shows sign-in required when wallet is connected but Abraxas session is missing", async () => {
    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Sign in to continue/i)).toBeTruthy();
    });
    expect(screen.queryByText(/^Session expired$/i)).toBeNull();
    expect(screen.getByText(/Sign-in required/i, { selector: "div" })).toBeTruthy();
  });

  it("shows dialog guidance when wallet sign-in modal is open", async () => {
    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Sign in to continue/i)).toBeTruthy();
    });

    window.dispatchEvent(
      new CustomEvent(WALLET_SIGN_IN_DIALOG_EVENT, { detail: { open: true } }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Complete sign-in in the dialog above/i)).toBeTruthy();
    });
  });
});
