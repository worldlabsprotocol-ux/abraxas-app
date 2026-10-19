// FILE: components/account/EphemeralSandboxWorkspaceClient.test.tsx
/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EphemeralSandboxWorkspaceClient } from "./EphemeralSandboxWorkspaceClient";
import { WalletContextProvider } from "@/components/WalletContextProvider";

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

describe("EphemeralSandboxWorkspaceClient", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/wallet/session")) {
          return new Response(
            JSON.stringify({
              authenticated: true,
              session_id: "sess_test_123",
              wallet_address: "Abcd1234WalletAddressExample111111111111",
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
              policies: [{ policy_id: "wallet_control", label: "Wallet Control", description: "" }],
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
              correlation_id: "esbx_req_test",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );
  });

  it("advances from Start building to workspace ready without wallet action signature", async () => {
    render(
      <WalletContextProvider>
        <EphemeralSandboxWorkspaceClient />
      </WalletContextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start building/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start building/i }));

    await waitFor(() => {
      expect(screen.getByText(/Choose a policy/i)).toBeTruthy();
    });
  });
});
