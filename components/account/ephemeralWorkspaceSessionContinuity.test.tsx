// FILE: components/account/ephemeralWorkspaceSessionContinuity.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EphemeralSandboxWorkspaceClient } from "./EphemeralSandboxWorkspaceClient";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { EPHEMERAL_WALLET_SESSION_EVENT } from "@/lib/auth/ephemeralWallet/clientSession";

vi.mock("@solana/wallet-adapter-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/wallet-adapter-react")>();
  return {
    ...actual,
    useWallet: () => ({
      publicKey: null,
      signMessage: undefined,
      connected: false,
      connecting: false,
      connect: vi.fn(),
      select: vi.fn(),
      wallet: null,
      wallets: [],
      disconnect: vi.fn(),
    }),
  };
});

describe("EphemeralSandboxWorkspaceClient session continuity", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    let authenticated = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/wallet/enabled")) {
          return new Response(JSON.stringify({ operational: true, config_ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/auth/wallet/session")) {
          if (!authenticated) {
            return new Response(JSON.stringify({ authenticated: false }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(
            JSON.stringify({
              authenticated: true,
              session_id: "sess_test_123",
              wallet_address: "Abcd1234WalletAddressExample111111111111",
              expires_at: new Date(Date.now() + 600_000).toISOString(),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/workspace")) {
          return new Response(JSON.stringify({ ok: true, workspace: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/api/auth/wallet/sandbox/policies")) {
          return new Response(
            JSON.stringify({
              policies: [{ policy_id: "wallet_control", label: "Wallet Control", description: "Demo" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/api/auth/wallet/sandbox/enter")) {
          return new Response(
            JSON.stringify({
              ok: true,
              workspace: {
                workspace_id: "esbx_test_workspace",
                expires_at: new Date(Date.now() + 3600_000).toISOString(),
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );

    window.addEventListener(EPHEMERAL_WALLET_SESSION_EVENT, () => {
      authenticated = true;
    });
  });

  it("refreshes workspace state when wallet session event fires without remounting", async () => {
    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Connect wallet/i })).toBeTruthy();
    });

    window.dispatchEvent(new Event(EPHEMERAL_WALLET_SESSION_EVENT));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start building/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start building/i }));

    await waitFor(() => {
      expect(screen.getByText(/Choose a policy/i)).toBeTruthy();
    });
  });
});
