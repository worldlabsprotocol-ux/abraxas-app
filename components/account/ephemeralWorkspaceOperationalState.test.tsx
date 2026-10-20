// FILE: components/account/ephemeralWorkspaceOperationalState.test.tsx
/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EphemeralSandboxWorkspaceClient } from "./EphemeralSandboxWorkspaceClient";
import { WalletContextProvider } from "@/components/WalletContextProvider";

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

describe("EphemeralSandboxWorkspaceClient operational state", () => {
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
          return Response.json({
            operational: false,
            config_code: "disabled",
            degraded_reason: "disabled",
          });
        }
        if (url.includes("/api/auth/wallet/sandbox/policies")) {
          return Response.json({ policies: [], availability: [] });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("maps disabled sandbox to a single unavailable state without active-session copy", async () => {
    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Developer sandbox unavailable/i)).toBeTruthy();
    });

    expect(screen.getByText(/Wallet sandbox disabled/i)).toBeTruthy();
    expect(screen.queryByText(/Your wallet session is active/i)).toBeNull();
    expect(screen.queryByText(/^Session expired$/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Start building/i })).toBeNull();
    expect(screen.getByText(/not an expired session/i)).toBeTruthy();
  });
});
